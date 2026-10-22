require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'server_db.json');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rednexus_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // SSL required for cloud databases (Aiven, PlanetScale, etc.)
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
};

let pool = null;
let isMySQLConnected = false;

async function initDB() {
    try {
        // On cloud (Aiven, etc.) the database already exists — skip CREATE DATABASE
        if (process.env.DB_SSL !== 'true') {
            const rootConn = await mysql.createConnection({
                host: dbConfig.host,
                user: dbConfig.user,
                password: dbConfig.password,
                port: dbConfig.port
            });
            await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
            await rootConn.end();
        }

        pool = mysql.createPool(dbConfig);
        const conn = await pool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        isMySQLConnected = true;
        console.log(`✅ Connected to MySQL Database ('${dbConfig.database}') successfully!`);
        await createTablesIfNotExist();
    } catch (err) {
        isMySQLConnected = false;
        console.warn('⚠️  MySQL connection not active. Operating in Local Data Store mode (JSON File backend).');
        console.warn(`   Reason: [${err.code || 'UNKNOWN'}] ${err.message}`);
    }
}

async function createTablesIfNotExist() {
    if (!isMySQLConnected || !pool) return;
    try {
        // 1. blood_banks — must exist before users & inventory (FK dependency)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS blood_banks (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                manager_name VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                address VARCHAR(255),
                city VARCHAR(100),
                reg_number VARCHAR(100),
                password_hash VARCHAR(255) NOT NULL DEFAULT '',
                status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. users — with reset token columns + status
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'Donor',
                bank_id VARCHAR(50) NULL,
                blood_group VARCHAR(10) DEFAULT 'O+',
                mobile VARCHAR(20) DEFAULT '',
                city VARCHAR(100),
                location VARCHAR(255),
                last_donation VARCHAR(50),
                status VARCHAR(20) DEFAULT 'Active',
                share_contact TINYINT(1) DEFAULT 0,
                reset_token VARCHAR(255) NULL,
                reset_token_hash VARCHAR(255) NULL,
                reset_expires BIGINT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bank_id) REFERENCES blood_banks(id) ON DELETE SET NULL
            );
        `);

        // Add missing columns to existing users table (idempotent)
        const alterColumns = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS share_contact TINYINT(1) DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255) NULL",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires BIGINT NULL"
        ];
        for (const sql of alterColumns) {
            try { await pool.query(sql); } catch (_) { /* column may already exist */ }
        }

        // Add missing columns to blood_banks (idempotent)
        const bankAlterCols = [
            "ALTER TABLE blood_banks ADD COLUMN IF NOT EXISTS reg_number VARCHAR(100)",
            "ALTER TABLE blood_banks ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT ''"
        ];
        for (const sql of bankAlterCols) {
            try { await pool.query(sql); } catch (_) {}
        }

        // 3. donors
        await pool.query(`
            CREATE TABLE IF NOT EXISTS donors (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                blood_group VARCHAR(10) NOT NULL,
                mobile VARCHAR(20),
                city VARCHAR(100),
                last_donation VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Eligible',
                share_contact TINYINT(1) DEFAULT 0,
                bank_id VARCHAR(50) NULL,
                FOREIGN KEY (bank_id) REFERENCES blood_banks(id) ON DELETE SET NULL
            );
        `);
        try { await pool.query("ALTER TABLE donors ADD COLUMN IF NOT EXISTS share_contact TINYINT(1) DEFAULT 0"); } catch (_) {}

        // 4. inventory scoped by bank_id
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                bank_id VARCHAR(50) NOT NULL,
                blood_group VARCHAR(10) NOT NULL,
                units INT DEFAULT 0,
                PRIMARY KEY (bank_id, blood_group),
                FOREIGN KEY (bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
            );
        `);

        // 5. audit_logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                bank_id VARCHAR(50) NULL,
                user_id VARCHAR(50) NULL,
                action VARCHAR(50),
                blood_group VARCHAR(10),
                before_units INT,
                after_units INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. requests
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                patient VARCHAR(255) NOT NULL,
                hospital VARCHAR(255) NOT NULL,
                contact VARCHAR(20) NOT NULL,
                blood VARCHAR(10) NOT NULL,
                units INT DEFAULT 1,
                level VARCHAR(50) DEFAULT 'Routine',
                status VARCHAR(50) DEFAULT 'Pending',
                date VARCHAR(50),
                user_id VARCHAR(50) NULL,
                bank_id VARCHAR(50) NULL
            );
        `);
        try { await pool.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) NULL"); } catch (_) {}

        // Sync JSON donors/users into MySQL (dedup by email)
        const jsonDB = readJSONDB();
        if (jsonDB.users && Array.isArray(jsonDB.users)) {
            for (const u of jsonDB.users) {
                if (!u.email) continue;
                const [exists] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ?', [u.email.toLowerCase()]);
                if (exists.length === 0) {
                    try {
                        await pool.query(
                            `INSERT INTO users (id, name, email, password_hash, role, blood_group, mobile, city, location, last_donation)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                u.id || ('RN-' + Math.floor(10000 + Math.random() * 89999)),
                                u.name || 'User',
                                u.email.toLowerCase(),
                                u.password_hash || '',
                                u.role || 'Donor',
                                u.blood || u.blood_group || 'O+',
                                u.mobile || '',
                                u.city || '',
                                u.location || '',
                                u.last || u.last_donation || 'Never'
                            ]
                        );
                    } catch (_) {}
                }
            }
        }

        if (jsonDB.donors && Array.isArray(jsonDB.donors)) {
            for (const d of jsonDB.donors) {
                if (!d.id) continue;
                const [dExists] = await pool.query('SELECT id FROM donors WHERE id = ?', [d.id]);
                if (dExists.length === 0) {
                    try {
                        await pool.query(
                            `INSERT INTO donors (id, name, blood_group, mobile, city, last_donation, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [d.id, d.name || 'Donor', d.blood || d.blood_group || 'O+', d.mobile || '', d.city || '', d.last || d.last_donation || 'Never', d.status || 'Eligible']
                        );
                    } catch (_) {}
                }
            }
        }

        console.log('✅ MySQL tables initialized/verified.');
    } catch (e) {
        console.error('Error initializing MySQL tables:', e);
    }
}

// JSON File DB helpers
function readJSONDB() {
    const initialDB = {
        inventory: { "A+": 25, "A-": 12, "B+": 8, "B-": 5, "AB+": 14, "AB-": 4, "O+": 3, "O-": 9, "Bombay": 2 },
        users: [{
            id: "RN-DEMO-001",
            name: "Alex Morgan",
            email: "demo@rednexus.org",
            password_hash: "$2a$10$wT0XqgHqV4E6C3i5jY0.u.3rXm2G2c1f0e4b8a7c6d5e4f3a2b1c",
            blood: "O+",
            mobile: "9876543210",
            city: "San Francisco",
            location: "Red Nexus Central",
            last: "2025-12-12",
            role: "Donor",
            share_contact: false
        }],
        donors: [
            { id: "RN-24081", name: "Maya Thompson", blood: "O+", mobile: "9876543210", city: "San Francisco", last: "2025-12-12", status: "Eligible", share_contact: false },
            { id: "RN-24076", name: "Daniel Okafor", blood: "A-", mobile: "9812345678", city: "Oakland", last: "2025-10-22", status: "Eligible", share_contact: false },
            { id: "RN-24064", name: "Sofia Martinez", blood: "B+", mobile: "9765432109", city: "Berkeley", last: "2025-08-03", status: "Due soon", share_contact: false }
        ],
        requests: [
            { id: 1, patient: "Harper James", hospital: "St. Mary's Medical Center", contact: "9898989898", units: 3, blood: "O-", level: "Critical", status: "Pending", date: "2026-08-26" }
        ],
        blood_banks: [],
        passwordResets: []
    };

    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
            return initialDB;
        }
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        // Ensure all keys exist (forward compat)
        if (!data.blood_banks) data.blood_banks = [];
        if (!data.passwordResets) data.passwordResets = [];
        return data;
    } catch {
        return initialDB;
    }
}

function writeJSONDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Failed to write JSON DB:', e);
    }
}

module.exports = {
    initDB,
    isMySQL: () => isMySQLConnected,
    getPool: () => pool,
    readJSONDB,
    writeJSONDB
};
