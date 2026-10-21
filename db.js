require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'server_db.json');

// MySQL Pool Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rednexus_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = null;
let isMySQLConnected = false;

async function initDB() {
    try {
        // Connect to server first to ensure database exists
        const rootConn = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await rootConn.end();

        // Initialize pool for the target database
        pool = mysql.createPool(dbConfig);
        const conn = await pool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        isMySQLConnected = true;
        console.log(`✅ Connected to MySQL Database ('${dbConfig.database}') successfully!`);
        await createTablesIfNotExist();
    } catch (err) {
        isMySQLConnected = false;
        console.warn('⚠️ MySQL connection not active. Operating in Local Data Store mode (JSON File backend).');
        console.warn(`   Reason: [${err.code || 'UNKNOWN'}] ${err.message}`);
        console.warn('   To use MySQL: Check DB_USER, DB_PASSWORD, and DB_NAME in .env file.');
    }
}

async function createTablesIfNotExist() {
    if (!isMySQLConnected || !pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'Donor',
                blood_group VARCHAR(10) NOT NULL,
                mobile VARCHAR(20) NOT NULL,
                city VARCHAR(100),
                location VARCHAR(255),
                last_donation VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS donors (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                blood_group VARCHAR(10) NOT NULL,
                mobile VARCHAR(20) NOT NULL,
                city VARCHAR(100),
                last_donation VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Eligible'
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                blood_group VARCHAR(10) PRIMARY KEY,
                units INT DEFAULT 0
            );
        `);

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
                date VARCHAR(50)
            );
        `);

        // Seed inventory if empty
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM inventory');
        if (rows[0].count === 0) {
            const defaultInv = [
                ['A+', 25], ['A-', 12], ['B+', 8], ['B-', 5],
                ['AB+', 14], ['AB-', 4], ['O+', 3], ['O-', 9], ['Bombay', 2]
            ];
            for (const [bg, units] of defaultInv) {
                await pool.query('INSERT INTO inventory (blood_group, units) VALUES (?, ?)', [bg, units]);
            }
        }

        // Auto-sync existing users, donors, and requests from JSON into MySQL
        const jsonDB = readJSONDB();
        if (jsonDB.users && Array.isArray(jsonDB.users)) {
            for (const u of jsonDB.users) {
                if (!u.email) continue;
                const [exists] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ?', [u.email.toLowerCase()]);
                if (exists.length === 0) {
                    await pool.query(
                        `INSERT INTO users (id, name, email, password_hash, role, blood_group, mobile, city, location, last_donation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [u.id || ('RN-' + Math.floor(10000 + Math.random() * 89999)), u.name || 'User', u.email.toLowerCase(), u.password_hash || '$2a$10$wT0XqgHqV4E6C3i5jY0.u.3rXm2G2c1f0e4b8a7c6d5e4f3a2b1c', u.role || 'Donor', u.blood || u.blood_group || 'O+', u.mobile || '', u.city || '', u.location || '', u.last || u.last_donation || 'Never']
                    );
                }
            }
        }

        if (jsonDB.donors && Array.isArray(jsonDB.donors)) {
            for (const d of jsonDB.donors) {
                if (!d.id) continue;
                const [dExists] = await pool.query('SELECT id FROM donors WHERE id = ?', [d.id]);
                if (dExists.length === 0) {
                    await pool.query(
                        `INSERT INTO donors (id, name, blood_group, mobile, city, last_donation, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [d.id, d.name || 'Donor', d.blood || d.blood_group || 'O+', d.mobile || '', d.city || '', d.last || d.last_donation || 'Never', d.status || 'Eligible']
                    );
                }
            }
        }
    } catch (e) {
        console.error('Error initializing MySQL tables:', e);
    }
}

// Fallback JSON File DB helpers
function readJSONDB() {
    const initialDB = {
        inventory: { "A+": 25, "A-": 12, "B+": 8, "B-": 5, "AB+": 14, "AB-": 4, "O+": 3, "O-": 9, "Bombay": 2 },
        users: [{
            id: "RN-DEMO-001",
            name: "Alex Morgan",
            email: "demo@rednexus.org",
            password: "nexus123",
            password_hash: "$2a$10$wT0XqgHqV4E6C3i5jY0.u.3rXm2G2c1f0e4b8a7c6d5e4f3a2b1c",
            blood: "O+",
            mobile: "9876543210",
            city: "San Francisco",
            location: "Red Nexus Central",
            last: "2025-12-12",
            role: "Donor"
        }],
        donors: [
            { id: "RN-24081", name: "Maya Thompson", blood: "O+", mobile: "9876543210", city: "San Francisco", last: "2025-12-12", status: "Eligible" },
            { id: "RN-24076", name: "Daniel Okafor", blood: "A-", mobile: "9812345678", city: "Oakland", last: "2025-10-22", status: "Eligible" },
            { id: "RN-24064", name: "Sofia Martinez", blood: "B+", mobile: "9765432109", city: "Berkeley", last: "2025-08-03", status: "Due soon" }
        ],
        requests: [
            { id: 1, patient: "Harper James", hospital: "St. Mary's Medical Center", contact: "9898989898", units: 3, blood: "O-", level: "Critical", status: "Pending", date: "2026-08-26" }
        ]
    };

    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
            return initialDB;
        }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
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
