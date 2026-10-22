require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rednexus_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// ── Rate limiters ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please wait.' }
});

// ── DB Init ──────────────────────────────────────────────────────────────────
db.initDB();

// ── Admin bootstrap from environment ────────────────────────────────────────
(async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPass  = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPass) return;

        const passwordHash = await bcrypt.hash(adminPass, 12);

        if (db.isMySQL()) {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [adminEmail.toLowerCase()]);
            if (rows.length === 0) {
                const adminId = 'ADMIN-' + Date.now();
                await pool.query(
                    `INSERT INTO users (id, name, email, password_hash, role, blood_group, mobile) VALUES (?,?,?,?,?,?,?)`,
                    [adminId, 'Administrator', adminEmail.toLowerCase(), passwordHash, 'Admin', 'O+', '']
                );
                console.log('✅ Initial admin user created in MySQL');
            }
        }

        const jsonDB = db.readJSONDB();
        const exists = jsonDB.users.find(u => u.email && u.email.toLowerCase() === adminEmail.toLowerCase());
        if (!exists) {
            jsonDB.users.push({
                id: 'ADMIN-' + Date.now(),
                name: 'Administrator',
                email: adminEmail.toLowerCase(),
                password_hash: passwordHash,
                role: 'Admin',
                blood: 'O+',
                mobile: ''
            });
            db.writeJSONDB(jsonDB);
            console.log('✅ Initial admin user added to JSON DB');
        }
    } catch (e) {
        console.error('Admin provisioning error:', e.message);
    }
})();

// ── Auth Middleware ──────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access token required.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
}

function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
        next();
    };
}

// ── Email helper ─────────────────────────────────────────────────────────────
async function sendResetEmail(recipientEmail, resetUrl) {
    const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

    const emailHtml = `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:24px;background:#f1f5f9;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:#0f172a;padding:28px 32px;text-align:center;">
          <h1 style="color:#ef4444;margin:0;font-size:26px;letter-spacing:-0.04em;">RED NEXUS</h1>
          <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;">Blood Bank &amp; Donor Portal</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1e293b;font-size:20px;margin:0 0 12px;">Password Reset Request</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 28px;">
            We received a request to reset the password for <strong>${recipientEmail}</strong>.<br>
            This link expires in <strong>1 hour</strong>.
          </p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${resetUrl}" target="_blank"
               style="background:#ef4444;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
              Reset Password →
            </a>
          </div>
          <p style="color:#64748b;font-size:12px;line-height:1.5;margin:24px 0 0;border-top:1px solid #f1f5f9;padding-top:16px;">
            Or copy this link: <a href="${resetUrl}" style="color:#ef4444;word-break:break-all;">${resetUrl}</a>
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">
            If you didn't request this, ignore this email. Your account is safe.
          </p>
        </div>
        <div style="background:#f8fafc;padding:18px 32px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;">
          © Red Nexus Blood Bank. All rights reserved.
        </div>
      </div>
    </body></html>`;

    if (smtpConfigured) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"Red Nexus" <no-reply@rednexus.org>',
                to: recipientEmail,
                subject: 'Red Nexus – Reset Your Password',
                html: emailHtml
            });
            console.log(`✉️  Password reset email sent to ${recipientEmail}`);
            return { sent: true, mode: 'smtp' };
        } catch (err) {
            console.warn(`⚠️  SMTP send failed: ${err.message}`);
            // Fall through to dev-mode logging
        }
    }

    // Dev fallback – print to console only
    console.log('\n================================================================');
    console.log('📧 [RED NEXUS DEV] Password Reset Link (SMTP not configured)');
    console.log(`Recipient : ${recipientEmail}`);
    console.log(`Reset URL : ${resetUrl}`);
    console.log('================================================================\n');
    return { sent: true, mode: 'local', resetUrl };
}

// ════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const cleanEmail = email.trim().toLowerCase();

    // MySQL path
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            // Check users table
            let [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
            if (rows.length) {
                const user = rows[0];
                const match = await bcrypt.compare(password, user.password_hash);
                if (match) {
                    const token = jwt.sign(
                        { id: user.id, email: user.email, role: user.role, bank_id: user.bank_id || null },
                        JWT_SECRET, { expiresIn: '24h' }
                    );
                    const safe = { ...user };
                    delete safe.password_hash; delete safe.reset_token; delete safe.reset_token_hash; delete safe.reset_expires;
                    return res.json({ success: true, token, user: safe });
                }
            }
            // Check blood_banks table (BankManager login)
            const [bankRows] = await pool.query('SELECT * FROM blood_banks WHERE LOWER(email) = ?', [cleanEmail]);
            if (bankRows.length) {
                const bank = bankRows[0];
                if (!bank.password_hash) {
                    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
                }
                const match = await bcrypt.compare(password, bank.password_hash);
                if (match) {
                    const bankUser = {
                        id: bank.id,
                        name: bank.name,
                        email: bank.email,
                        role: 'BankManager',
                        bank_id: bank.id,
                        bank_name: bank.name,
                        bank_status: bank.status,
                        manager_name: bank.manager_name,
                        phone: bank.phone,
                        address: bank.address,
                        city: bank.city,
                        reg_number: bank.reg_number
                    };
                    const token = jwt.sign(
                        { id: bank.id, email: bank.email, role: 'BankManager', bank_id: bank.id, bank_status: bank.status },
                        JWT_SECRET, { expiresIn: '24h' }
                    );
                    return res.json({ success: true, token, user: bankUser });
                }
            }
        } catch (e) {
            console.error('MySQL login error:', e.message);
        }
    }

    // JSON fallback
    const jsonDB = db.readJSONDB();
    const user = jsonDB.users.find(u =>
        (u.email && u.email.trim().toLowerCase() === cleanEmail) ||
        (u.username && u.username.trim().toLowerCase() === cleanEmail)
    );
    if (user && user.password_hash) {
        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
            const safe = { ...user };
            delete safe.password_hash; delete safe.reset_token; delete safe.reset_token_hash; delete safe.reset_expires;
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role || 'Donor', bank_id: user.bank_id || null },
                JWT_SECRET, { expiresIn: '24h' }
            );
            return res.json({ success: true, token, user: safe });
        }
    }
    // Check JSON blood banks
    const bank = (jsonDB.blood_banks || []).find(b => b.email && b.email.toLowerCase() === cleanEmail);
    if (bank && bank.password_hash) {
        const match = await bcrypt.compare(password, bank.password_hash);
        if (match) {
            const bankUser = { id: bank.id, name: bank.name, email: bank.email, role: 'BankManager', bank_id: bank.id, bank_name: bank.name, bank_status: bank.status, manager_name: bank.manager_name };
            const token = jwt.sign(
                { id: bank.id, email: bank.email, role: 'BankManager', bank_id: bank.id, bank_status: bank.status },
                JWT_SECRET, { expiresIn: '24h' }
            );
            return res.json({ success: true, token, user: bankUser });
        }
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
});

// POST /api/auth/register-donor
app.post('/api/auth/register-donor', async (req, res) => {
    const d = req.body;
    if (!d.name || !d.email || !d.password || !d.blood || !d.mobile)
        return res.status(400).json({ success: false, message: 'Name, email, blood group, mobile and password are required.' });

    const cleanEmail = d.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(d.password, 12);
    const donorId = 'RN-' + Math.floor(10000 + Math.random() * 89999);

    const newDonor = {
        id: donorId,
        name: d.name,
        email: cleanEmail,
        password_hash: passwordHash,
        blood: d.blood,
        blood_group: d.blood,
        mobile: d.mobile,
        city: d.city || '',
        location: d.location || '',
        last: d.last || 'Never',
        status: 'Eligible',
        role: 'Donor',
        share_contact: d.share_contact ? 1 : 0
    };

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
            if (exists.length) return res.status(409).json({ success: false, message: 'Email already registered.' });

            await pool.query(
                `INSERT INTO users (id, name, email, password_hash, role, blood_group, mobile, city, location, last_donation, share_contact)
                 VALUES (?, ?, ?, ?, 'Donor', ?, ?, ?, ?, ?, ?)`,
                [donorId, newDonor.name, cleanEmail, passwordHash, newDonor.blood, newDonor.mobile, newDonor.city, newDonor.location, newDonor.last, newDonor.share_contact]
            );
            await pool.query(
                `INSERT INTO donors (id, name, blood_group, mobile, city, last_donation, status, share_contact)
                 VALUES (?, ?, ?, ?, ?, ?, 'Eligible', ?)`,
                [donorId, newDonor.name, newDonor.blood, newDonor.mobile, newDonor.city, newDonor.last, newDonor.share_contact]
            );
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email already registered.' });
            console.error('MySQL register-donor error:', e.message);
        }
    }

    // JSON sync
    const jsonDB = db.readJSONDB();
    const jExists = jsonDB.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (jExists) return res.status(409).json({ success: false, message: 'Email already registered.' });

    jsonDB.users.push(newDonor);
    jsonDB.donors.unshift({
        id: donorId, name: newDonor.name, blood: newDonor.blood,
        mobile: newDonor.mobile, city: newDonor.city, last: newDonor.last,
        status: 'Eligible', share_contact: newDonor.share_contact
    });
    db.writeJSONDB(jsonDB);

    const token = jwt.sign({ id: donorId, email: cleanEmail, role: 'Donor', bank_id: null }, JWT_SECRET, { expiresIn: '24h' });
    const safe = { ...newDonor }; delete safe.password_hash;
    res.json({ success: true, token, user: safe });
});

// POST /api/auth/register-acceptor
app.post('/api/auth/register-acceptor', async (req, res) => {
    const d = req.body;
    if (!d.name || !d.email || !d.password || !d.mobile)
        return res.status(400).json({ success: false, message: 'Name, email, mobile and password are required.' });

    const cleanEmail = d.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(d.password, 12);
    const accId = 'RN-ACC-' + Math.floor(10000 + Math.random() * 89999);

    const newAcceptor = {
        id: accId, name: d.name, email: cleanEmail,
        password_hash: passwordHash, blood: d.blood || '', blood_group: d.blood || '',
        mobile: d.mobile, city: d.city || '', location: d.hospital || '',
        role: 'Acceptor'
    };

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
            if (exists.length) return res.status(409).json({ success: false, message: 'Email already registered.' });

            await pool.query(
                `INSERT INTO users (id, name, email, password_hash, role, blood_group, mobile, city, location)
                 VALUES (?, ?, ?, ?, 'Acceptor', ?, ?, ?, ?)`,
                [accId, newAcceptor.name, cleanEmail, passwordHash, newAcceptor.blood, newAcceptor.mobile, newAcceptor.city, newAcceptor.location]
            );
            if (d.hospital && d.blood && d.mobile) {
                await pool.query(
                    `INSERT INTO requests (patient, hospital, contact, blood, units, level, status, date, user_id)
                     VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
                    [d.name, d.hospital, d.mobile, d.blood, Number(d.units) || 1, d.level || 'Routine', new Date().toISOString().slice(0, 10), accId]
                );
            }
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email already registered.' });
            console.error('MySQL register-acceptor error:', e.message);
        }
    }

    const jsonDB = db.readJSONDB();
    const jExists = jsonDB.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (jExists) return res.status(409).json({ success: false, message: 'Email already registered.' });

    jsonDB.users.push(newAcceptor);
    if (d.hospital) {
        jsonDB.requests.unshift({
            id: Date.now(), patient: d.name, hospital: d.hospital,
            contact: d.mobile, units: Number(d.units) || 1, blood: d.blood,
            level: d.level || 'Routine', status: 'Pending',
            date: new Date().toISOString().slice(0, 10), user_id: accId
        });
    }
    db.writeJSONDB(jsonDB);

    const token = jwt.sign({ id: accId, email: cleanEmail, role: 'Acceptor', bank_id: null }, JWT_SECRET, { expiresIn: '24h' });
    const safe = { ...newAcceptor }; delete safe.password_hash;
    res.json({ success: true, token, user: safe });
});

// POST /api/auth/register-bank  (Public – creates Pending bank account)
app.post('/api/auth/register-bank', async (req, res) => {
    try {
        const { name, manager_name, email, phone, address, city, reg_number, password } = req.body;
        if (!name || !email || !password || !manager_name || !phone)
            return res.status(400).json({ success: false, message: 'Bank name, manager name, email, phone and password are required.' });

        const cleanEmail = email.trim().toLowerCase();
        const passwordHash = await bcrypt.hash(password, 12);
        const bankId = 'BANK-' + Date.now();

        if (db.isMySQL()) {
            const pool = db.getPool();
            const [exists] = await pool.query('SELECT id FROM blood_banks WHERE email = ?', [cleanEmail]);
            if (exists.length) return res.status(409).json({ success: false, message: 'Email already registered.' });

            await pool.query(
                `INSERT INTO blood_banks (id, name, manager_name, email, phone, address, city, reg_number, password_hash, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                [bankId, name, manager_name, cleanEmail, phone, address || '', city || '', reg_number || '', passwordHash]
            );
            return res.json({ success: true, message: 'Blood bank registered! Pending admin approval before you can manage inventory.', bankId });
        }

        // JSON fallback
        const jsonDB = db.readJSONDB();
        const jExists = (jsonDB.blood_banks || []).find(b => b.email && b.email.toLowerCase() === cleanEmail);
        if (jExists) return res.status(409).json({ success: false, message: 'Email already registered.' });

        jsonDB.blood_banks = jsonDB.blood_banks || [];
        jsonDB.blood_banks.push({ id: bankId, name, manager_name, email: cleanEmail, phone, address: address || '', city: city || '', reg_number: reg_number || '', password_hash: passwordHash, status: 'Pending' });
        db.writeJSONDB(jsonDB);

        return res.json({ success: true, message: 'Blood bank registered! Pending admin approval before you can manage inventory.', bankId });
    } catch (e) {
        console.error('register-bank error:', e.message);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
    const rawInput = (req.body.email || '').trim();
    if (!rawInput) return res.status(400).json({ success: false, message: 'Email is required.' });

    const cleanInput = rawInput.toLowerCase();
    let matchedEmail = null;

    // Find user in MySQL or JSON
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT email FROM users WHERE LOWER(email) = ?', [cleanInput]);
            if (rows.length) matchedEmail = rows[0].email;
            if (!matchedEmail) {
                const [bRows] = await pool.query('SELECT email FROM blood_banks WHERE LOWER(email) = ?', [cleanInput]);
                if (bRows.length) matchedEmail = bRows[0].email;
            }
        } catch (e) { console.error('Forgot password MySQL error:', e.message); }
    }

    if (!matchedEmail) {
        const jsonDB = db.readJSONDB();
        const u = jsonDB.users.find(u => u.email && u.email.toLowerCase() === cleanInput);
        if (u) matchedEmail = u.email;
        if (!matchedEmail) {
            const b = (jsonDB.blood_banks || []).find(b => b.email && b.email.toLowerCase() === cleanInput);
            if (b) matchedEmail = b.email;
        }
    }

    // Generic response to prevent email enumeration
    if (!matchedEmail) {
        return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store hashed token
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query(
                'UPDATE users SET reset_token_hash = ?, reset_expires = ? WHERE LOWER(email) = ?',
                [tokenHash, expires, matchedEmail.toLowerCase()]
            );
        } catch (e) { console.error('Reset token store error:', e.message); }
    }

    const jsonDB = db.readJSONDB();
    const jsonUser = jsonDB.users.find(u => u.email && u.email.toLowerCase() === matchedEmail.toLowerCase());
    if (jsonUser) { jsonUser.reset_token_hash = tokenHash; jsonUser.reset_expires = expires; db.writeJSONDB(jsonDB); }
    // Also store for banks in JSON
    const jsonBank = (jsonDB.blood_banks || []).find(b => b.email && b.email.toLowerCase() === matchedEmail.toLowerCase());
    if (jsonBank) { jsonBank.reset_token_hash = tokenHash; jsonBank.reset_expires = expires; db.writeJSONDB(jsonDB); }

    const clientBase = process.env.CLIENT_URL || `http://localhost:${PORT}`;
    // Use /reset path — clean URL that the SPA handles via a dedicated redirect
    const resetUrl = `${clientBase}/reset?token=${rawToken}`;

    const emailResult = await sendResetEmail(matchedEmail, resetUrl);

    const resp = { success: true, message: 'If that email is registered, a reset link has been sent.' };
    return res.json(resp);
});

// POST /api/auth/reset-password-confirm
app.post('/api/auth/reset-password-confirm', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
        return res.status(400).json({ success: false, message: 'Token and new password are required.' });

    if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Date.now();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    let updated = false;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query(
                'SELECT id FROM users WHERE reset_token_hash = ? AND reset_expires > ?',
                [tokenHash, now]
            );
            if (rows.length) {
                await pool.query(
                    'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL WHERE id = ?',
                    [passwordHash, rows[0].id]
                );
                updated = true;
            }
        } catch (e) { console.error('Reset confirm MySQL error:', e.message); }
    }

    const jsonDB = db.readJSONDB();
    const jsonUser = jsonDB.users.find(u => u.reset_token_hash === tokenHash && u.reset_expires > now);
    if (jsonUser) {
        jsonUser.password_hash = passwordHash;
        jsonUser.reset_token_hash = null;
        jsonUser.reset_expires = null;
        db.writeJSONDB(jsonDB);
        updated = true;
    }
    const jsonBank = (jsonDB.blood_banks || []).find(b => b.reset_token_hash === tokenHash && b.reset_expires > now);
    if (jsonBank) {
        jsonBank.password_hash = passwordHash;
        jsonBank.reset_token_hash = null;
        jsonBank.reset_expires = null;
        db.writeJSONDB(jsonDB);
        updated = true;
    }

    if (!updated)
        return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired. Please request a new one.' });

    return res.json({ success: true, message: 'Password updated successfully! You can now sign in.' });
});

// POST /api/auth/reset-password  (direct – legacy)
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
        return res.status(400).json({ success: false, message: 'Email and new password required.' });

    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    let found = false;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [r] = await pool.query('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [passwordHash, cleanEmail]);
            if (r.affectedRows > 0) found = true;
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    const u = jsonDB.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (u) { u.password_hash = passwordHash; db.writeJSONDB(jsonDB); found = true; }

    if (!found) return res.status(404).json({ success: false, message: 'Account not found.' });
    return res.json({ success: true, message: 'Password updated.' });
});

// ── Profile ───────────────────────────────────────────────────────────────────
// GET /api/profile  – returns full profile of the authenticated user
app.get('/api/profile', authenticateToken, async (req, res) => {
    const { id, role, bank_id } = req.user;

    if (role === 'BankManager') {
        if (db.isMySQL()) {
            try {
                const pool = db.getPool();
                const [rows] = await pool.query('SELECT id,name,manager_name,email,phone,address,city,reg_number,status,created_at FROM blood_banks WHERE id = ?', [bank_id || id]);
                if (rows.length) return res.json({ success: true, profile: { ...rows[0], role: 'BankManager' } });
            } catch (e) { console.error(e.message); }
        }
        const jsonDB = db.readJSONDB();
        const bank = (jsonDB.blood_banks || []).find(b => b.id === (bank_id || id));
        if (bank) {
            const safe = { ...bank }; delete safe.password_hash; delete safe.reset_token_hash; delete safe.reset_expires;
            return res.json({ success: true, profile: { ...safe, role: 'BankManager' } });
        }
        return res.status(404).json({ success: false, message: 'Bank profile not found.' });
    }

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query(
                'SELECT id,name,email,role,blood_group,mobile,city,location,last_donation,status,share_contact,created_at,bank_id FROM users WHERE id = ?',
                [id]
            );
            if (rows.length) {
                const p = rows[0];
                return res.json({ success: true, profile: { ...p, blood: p.blood_group } });
            }
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    const u = jsonDB.users.find(u => u.id === id);
    if (u) {
        const safe = { ...u }; delete safe.password_hash; delete safe.reset_token_hash; delete safe.reset_expires;
        return res.json({ success: true, profile: safe });
    }
    return res.status(404).json({ success: false, message: 'Profile not found.' });
});

// PATCH /api/profile  – update own profile fields
app.patch('/api/profile', authenticateToken, async (req, res) => {
    const { id, role } = req.user;
    const allowed = ['name', 'mobile', 'city', 'location', 'last_donation', 'share_contact'];
    const updates = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

    if (Object.keys(updates).length === 0)
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
            await pool.query(`UPDATE users SET ${setClauses} WHERE id = ?`, [...Object.values(updates), id]);
            // If donor, sync donors table
            if (role === 'Donor') {
                const donorUpdates = {};
                if (updates.name) donorUpdates.name = updates.name;
                if (updates.mobile) donorUpdates.mobile = updates.mobile;
                if (updates.city) donorUpdates.city = updates.city;
                if (updates.share_contact !== undefined) donorUpdates.share_contact = updates.share_contact;
                if (Object.keys(donorUpdates).length) {
                    const dc = Object.keys(donorUpdates).map(k => `\`${k}\` = ?`).join(', ');
                    await pool.query(`UPDATE donors SET ${dc} WHERE id = ?`, [...Object.values(donorUpdates), id]);
                }
            }
        } catch (e) { console.error('Profile update MySQL error:', e.message); }
    }

    const jsonDB = db.readJSONDB();
    const u = jsonDB.users.find(u => u.id === id);
    if (u) { Object.assign(u, updates); db.writeJSONDB(jsonDB); }

    return res.json({ success: true, message: 'Profile updated.' });
});

// ════════════════════════════════════════════════════════════════════════════
//  INVENTORY ROUTES  (Blood Bank only)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/inventory  – BankManager only (own bank)
app.get('/api/inventory', authenticateToken, authorizeRoles('Admin', 'BankManager'), async (req, res) => {
    const { role, bank_id } = req.user;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            let rows;
            if (role === 'Admin') {
                [rows] = await pool.query('SELECT blood_group, units, bank_id FROM inventory');
            } else {
                [rows] = await pool.query('SELECT blood_group, units FROM inventory WHERE bank_id = ?', [bank_id]);
            }
            const result = {};
            rows.forEach(r => result[r.blood_group] = r.units);
            return res.json(result);
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    // JSON mode: bank inventory is keyed by bank_id inside inventory if exists, or flat object
    if (bank_id && jsonDB[`inventory_${bank_id}`]) return res.json(jsonDB[`inventory_${bank_id}`]);
    return res.json(jsonDB.inventory || {});
});

// POST /api/inventory  – BankManager only (own bank)
app.post('/api/inventory', authenticateToken, authorizeRoles('BankManager'), async (req, res) => {
    const { bank_id } = req.user;
    const inventory = req.body;

    // Validate: non-negative integers only
    for (const [bg, units] of Object.entries(inventory)) {
        if (!Number.isInteger(Number(units)) || Number(units) < 0)
            return res.status(400).json({ success: false, message: `Invalid unit value for ${bg}.` });
    }

    // Check bank is approved
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [bankRows] = await pool.query('SELECT status FROM blood_banks WHERE id = ?', [bank_id]);
            if (!bankRows.length || bankRows[0].status !== 'Approved')
                return res.status(403).json({ success: false, message: 'Your blood bank account is not yet approved.' });

            for (const [bg, units] of Object.entries(inventory)) {
                const [prev] = await pool.query('SELECT units FROM inventory WHERE bank_id = ? AND blood_group = ?', [bank_id, bg]);
                const before = prev.length ? prev[0].units : 0;
                await pool.query(
                    'INSERT INTO inventory (bank_id, blood_group, units) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE units = ?',
                    [bank_id, bg, units, units]
                );
                await pool.query(
                    'INSERT INTO audit_logs (bank_id, user_id, action, blood_group, before_units, after_units) VALUES (?, ?, ?, ?, ?, ?)',
                    [bank_id, req.user.id, 'inventory_update', bg, before, units]
                );
            }
            return res.json({ success: true, inventory });
        } catch (e) {
            console.error('Inventory update MySQL error:', e.message);
            return res.status(500).json({ success: false, message: 'Server error updating inventory.' });
        }
    }

    // JSON mode: verify bank status
    const jsonDB = db.readJSONDB();
    const bank = (jsonDB.blood_banks || []).find(b => b.id === bank_id);
    if (!bank || bank.status !== 'Approved')
        return res.status(403).json({ success: false, message: 'Your blood bank account is not yet approved.' });

    jsonDB[`inventory_${bank_id}`] = inventory;
    db.writeJSONDB(jsonDB);
    return res.json({ success: true, inventory });
});

// ════════════════════════════════════════════════════════════════════════════
//  DONORS ROUTES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/donors  – authenticated users; privacy filter applied
app.get('/api/donors', authenticateToken, async (req, res) => {
    const { role } = req.user;
    const { blood, city } = req.query;

    let donors = [];
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            let sql = 'SELECT id, name, blood_group, city, last_donation, status, share_contact FROM donors WHERE 1=1';
            const params = [];
            if (blood) { sql += ' AND blood_group = ?'; params.push(blood); }
            if (city) { sql += ' AND city LIKE ?'; params.push(`%${city}%`); }
            const [rows] = await pool.query(sql, params);
            donors = rows;
        } catch (e) { console.error(e.message); }
    }

    if (!donors.length) {
        let jDonors = db.readJSONDB().donors || [];
        if (blood) jDonors = jDonors.filter(d => (d.blood || d.blood_group) === blood);
        if (city) jDonors = jDonors.filter(d => d.city && d.city.toLowerCase().includes(city.toLowerCase()));
        donors = jDonors;
    }

    // Privacy: remove mobile from non-admin/non-bank roles unless share_contact
    const safeDonors = donors.map(d => {
        const safe = {
            id: d.id,
            name: d.name,
            blood: d.blood || d.blood_group,
            blood_group: d.blood || d.blood_group,
            city: d.city,
            last: d.last || d.last_donation,
            last_donation: d.last || d.last_donation,
            status: d.status,
            share_contact: d.share_contact
        };
        if (role === 'Admin' || role === 'BankManager' || d.share_contact) {
            safe.mobile = d.mobile;
        }
        return safe;
    });

    return res.json(safeDonors);
});

// ════════════════════════════════════════════════════════════════════════════
//  REQUESTS ROUTES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/requests  – authenticated
app.get('/api/requests', authenticateToken, async (req, res) => {
    const { role, id: userId } = req.user;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            let rows;
            if (role === 'Admin' || role === 'BankManager') {
                [rows] = await pool.query('SELECT * FROM requests ORDER BY id DESC');
            } else {
                // Acceptors see only their own requests; Donors see all (visibility by design)
                [rows] = await pool.query('SELECT * FROM requests WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC', [userId]);
            }
            return res.json(rows);
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    let reqs = jsonDB.requests || [];
    if (role === 'Acceptor') {
        reqs = reqs.filter(r => !r.user_id || r.user_id === userId);
    }
    return res.json(reqs);
});

app.post('/api/requests', authenticateToken, async (req, res) => {
    const reqData = req.body;
    const { id: userId, bank_id } = req.user;

    const newReq = {
        id: Date.now(),
        patient: reqData.patient,
        hospital: reqData.hospital,
        contact: reqData.contact,
        blood: reqData.blood,
        units: Number(reqData.units) || 1,
        level: reqData.level || 'Routine',
        status: 'Pending',
        date: new Date().toISOString().slice(0, 10),
        bank_id: bank_id || null,
        user_id: userId
    };

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query(
                `INSERT INTO requests (patient, hospital, contact, blood, units, level, status, date, bank_id, user_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [newReq.patient, newReq.hospital, newReq.contact, newReq.blood, newReq.units, newReq.level, 'Pending', newReq.date, newReq.bank_id, newReq.user_id]
            );
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    jsonDB.requests.unshift(newReq);
    db.writeJSONDB(jsonDB);
    res.json(newReq);
});

app.patch('/api/requests/:id/status', authenticateToken, authorizeRoles('Admin', 'BankManager'), async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query('UPDATE requests SET status = ? WHERE id = ?', [status, id]);
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    const r = jsonDB.requests.find(r => r.id === id);
    if (r) r.status = status;
    db.writeJSONDB(jsonDB);
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/users
app.get('/api/admin/users', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query(
                'SELECT id,name,email,role,blood_group,city,status,created_at,bank_id FROM users ORDER BY created_at DESC'
            );
            return res.json(rows);
        } catch (e) { console.error(e.message); }
    }
    const jsonDB = db.readJSONDB();
    const safe = (jsonDB.users || []).map(u => {
        const s = { ...u }; delete s.password_hash; delete s.reset_token_hash; delete s.reset_expires;
        return s;
    });
    return res.json(safe);
});

// GET /api/admin/banks
app.get('/api/admin/banks', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT id,name,manager_name,email,phone,address,city,reg_number,status,created_at FROM blood_banks ORDER BY created_at DESC');
            return res.json(rows);
        } catch (e) { console.error(e.message); }
    }
    const jsonDB = db.readJSONDB();
    const safe = (jsonDB.blood_banks || []).map(b => {
        const s = { ...b }; delete s.password_hash; delete s.reset_token_hash; delete s.reset_expires;
        return s;
    });
    return res.json(safe);
});

// PATCH /api/admin/banks/:bankId/approve
app.patch('/api/admin/banks/:bankId/approve', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    const { bankId } = req.params;
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status.' });

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query('UPDATE blood_banks SET status = ? WHERE id = ?', [status, bankId]);
            // Seed inventory rows for newly-approved bank
            if (status === 'Approved') {
                const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Bombay'];
                for (const bg of BLOOD_GROUPS) {
                    await pool.query(
                        'INSERT IGNORE INTO inventory (bank_id, blood_group, units) VALUES (?, ?, 0)',
                        [bankId, bg]
                    );
                }
            }
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    const bank = (jsonDB.blood_banks || []).find(b => b.id === bankId);
    if (bank) { bank.status = status; db.writeJSONDB(jsonDB); }

    return res.json({ success: true, bankId, status });
});

// PATCH /api/admin/users/:userId/status
app.patch('/api/admin/users/:userId/status', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;
    if (!['Active', 'Suspended'].includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status.' });

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
        } catch (e) { console.error(e.message); }
    }

    const jsonDB = db.readJSONDB();
    const u = jsonDB.users.find(u => u.id === userId);
    if (u) { u.status = status; db.writeJSONDB(jsonDB); }
    return res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  BANK SELF-SERVICE
// ════════════════════════════════════════════════════════════════════════════

// GET /api/bank/profile
app.get('/api/bank/profile', authenticateToken, authorizeRoles('BankManager'), async (req, res) => {
    const { bank_id } = req.user;
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query(
                'SELECT id,name,manager_name,email,phone,address,city,reg_number,status FROM blood_banks WHERE id = ?',
                [bank_id]
            );
            if (rows.length) return res.json({ success: true, bank: rows[0] });
        } catch (e) { console.error(e.message); }
    }
    const jsonDB = db.readJSONDB();
    const bank = (jsonDB.blood_banks || []).find(b => b.id === bank_id);
    if (!bank) return res.status(404).json({ success: false, message: 'Bank not found.' });
    const safe = { ...bank }; delete safe.password_hash; delete safe.reset_token_hash; delete safe.reset_expires;
    return res.json({ success: true, bank: safe });
});

// ════════════════════════════════════════════════════════════════════════════
//  CSV EXPORTS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/export/donors/csv', authenticateToken, authorizeRoles('Admin', 'BankManager'), async (req, res) => {
    let donors = [];
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT id,name,blood_group,mobile,city,last_donation,status FROM donors');
            donors = rows;
        } catch (e) {}
    }
    if (!donors.length) donors = db.readJSONDB().donors || [];

    let csv = 'ID,Name,Blood Group,Mobile,City,Last Donation,Status\n';
    donors.forEach(d => {
        csv += `"${d.id}","${d.name}","${d.blood || d.blood_group}","${d.mobile || ''}","${d.city || ''}","${d.last || d.last_donation || ''}","${d.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="RedNexus_Donors.csv"');
    res.send(csv);
});

app.get('/api/export/inventory/csv', authenticateToken, authorizeRoles('Admin', 'BankManager'), async (req, res) => {
    const { bank_id } = req.user;
    let inventory = {};

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT blood_group, units FROM inventory WHERE bank_id = ?', [bank_id]);
            rows.forEach(r => inventory[r.blood_group] = r.units);
        } catch (e) {}
    }
    if (!Object.keys(inventory).length) {
        const jsonDB = db.readJSONDB();
        inventory = jsonDB[`inventory_${bank_id}`] || jsonDB.inventory || {};
    }

    let csv = 'Blood Group,Available Units,Status\n';
    for (const [bg, units] of Object.entries(inventory)) {
        const status = units <= 3 ? 'Critical' : units <= 8 ? 'Low Stock' : 'Available';
        csv += `"${bg}","${units}","${status}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="RedNexus_Inventory.csv"');
    res.send(csv);
});

// ════════════════════════════════════════════════════════════════════════════
//  EMERGENCY ALERT
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/notifications/alert', authenticateToken, (req, res) => {
    const { blood, hospital, units } = req.body;
    console.log(`🚨 EMERGENCY: ${units} units of ${blood} at ${hospital}`);
    res.json({ success: true, message: `Emergency alert dispatched for ${blood} donors.` });
});

// ════════════════════════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER — ensures API routes always return JSON, never HTML
// ════════════════════════════════════════════════════════════════════════════
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    if (req.path.startsWith('/api')) {
        return res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
    }
    next(err);
});

// ════════════════════════════════════════════════════════════════════════════
//  STATIC FILES
// ════════════════════════════════════════════════════════════════════════════
app.use(express.static(__dirname));

// Fallback: serve index.html for all non-API routes (SPA)
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    const localIp = process.env.CLIENT_URL || `http://localhost:${PORT}`;
    console.log(`\n🩸 Red Nexus Server running on:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: ${localIp}`);
    console.log(`   Mode: ${process.env.DB_PASSWORD ? 'MySQL' : 'JSON fallback'}`);
});
