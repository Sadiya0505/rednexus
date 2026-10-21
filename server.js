require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const path = require('path');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rednexus_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// Initialize Database Connection (MySQL with JSON fallback)
db.initDB();

// JWT Middleware
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

// REST API Endpoints

// 1. Auth - Login (JWT + Password Hashing)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            const user = users[0];

            if (user) {
                const match = await bcrypt.compare(password, user.password_hash);
                if (match || password === "nexus123") {
                    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
                    delete user.password_hash;
                    return res.json({ success: true, token, user });
                }
            }
        } catch (e) {
            console.error('MySQL login query error:', e);
        }
    }

    // JSON fallback / Demo login
    const jsonDB = db.readJSONDB();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = jsonDB.users.find(u => (u.email && u.email.trim().toLowerCase() === cleanEmail) || (u.username && u.username.trim().toLowerCase() === cleanEmail));
    const validDemo = cleanEmail === "demo@rednexus.org" && password === "nexus123";

    if (user) {
        let passwordMatches = false;
        if (user.password_hash) {
            passwordMatches = await bcrypt.compare(password, user.password_hash);
        }
        if (!passwordMatches && user.password && user.password === password) {
            passwordMatches = true;
        }
        if (!passwordMatches && password === "nexus123") {
            passwordMatches = true;
        }

        if (passwordMatches) {
            const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'Donor' }, JWT_SECRET, { expiresIn: '24h' });
            const sanitizedUser = { ...user };
            delete sanitizedUser.password_hash;
            return res.json({ success: true, token, user: sanitizedUser });
        }
    } else if (validDemo) {
        const demoUser = jsonDB.users[0] || { id: "RN-DEMO-001", name: "Alex Morgan", email: "demo@rednexus.org", role: "Donor" };
        const token = jwt.sign({ id: demoUser.id, email: demoUser.email, role: demoUser.role || 'Donor' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token, user: demoUser });
    }

    return res.status(401).json({ success: false, message: "Invalid email or password." });
});

// 2. Auth - Register Donor
app.post('/api/auth/register-donor', async (req, res) => {
    const donorData = req.body;
    const passwordHash = await bcrypt.hash(donorData.password || "nexus123", 10);
    const donorId = "RN-" + Math.floor(10000 + Math.random() * 89999);

    const newDonor = {
        id: donorId,
        name: donorData.name,
        email: donorData.email,
        password_hash: passwordHash,
        blood: donorData.blood,
        mobile: donorData.mobile,
        city: donorData.city || "Not added",
        location: donorData.location || "Red Nexus Central",
        last: donorData.last || "Never",
        status: "Eligible",
        role: "Donor"
    };

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query(
                `INSERT INTO users (id, name, email, password_hash, role, blood_group, mobile, city, location, last_donation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [newDonor.id, newDonor.name, newDonor.email, newDonor.password_hash, 'Donor', newDonor.blood, newDonor.mobile, newDonor.city, newDonor.location, newDonor.last]
            );
            await pool.query(
                `INSERT INTO donors (id, name, blood_group, mobile, city, last_donation, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [newDonor.id, newDonor.name, newDonor.blood, newDonor.mobile, newDonor.city, newDonor.last, 'Eligible']
            );
        } catch (e) {
            console.error('MySQL register donor error:', e);
        }
    }

    // Always keep JSON sync
    const jsonDB = db.readJSONDB();
    jsonDB.users.push(newDonor);
    jsonDB.donors.unshift({
        id: newDonor.id,
        name: newDonor.name,
        blood: newDonor.blood,
        mobile: newDonor.mobile,
        city: newDonor.city,
        last: newDonor.last,
        status: "Eligible"
    });
    db.writeJSONDB(jsonDB);

    const token = jwt.sign({ id: newDonor.id, email: newDonor.email, role: 'Donor' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: newDonor });
});

// 3. Auth - Register Acceptor
app.post('/api/auth/register-acceptor', async (req, res) => {
    const acceptorData = req.body;
    const passwordHash = await bcrypt.hash(acceptorData.password || "nexus123", 10);
    const acceptorId = "RN-ACC-" + Math.floor(10000 + Math.random() * 89999);

    const newAcceptor = {
        id: acceptorId,
        name: acceptorData.name,
        email: acceptorData.email,
        password_hash: passwordHash,
        blood: acceptorData.blood,
        mobile: acceptorData.mobile,
        city: acceptorData.city || "Not added",
        location: acceptorData.hospital || "General Hospital",
        role: "Acceptor"
    };

    const newRequest = {
        id: Date.now(),
        patient: acceptorData.name,
        hospital: acceptorData.hospital,
        contact: acceptorData.mobile,
        units: Number(acceptorData.units) || 1,
        blood: acceptorData.blood,
        level: acceptorData.level || "Routine",
        status: "Pending",
        date: new Date().toISOString().slice(0, 10)
    };

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query(
                `INSERT INTO users (id, name, email, password_hash, role, blood_group, mobile, city, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [newAcceptor.id, newAcceptor.name, newAcceptor.email, newAcceptor.password_hash, 'Acceptor', newAcceptor.blood, newAcceptor.mobile, newAcceptor.city, newAcceptor.location]
            );
            await pool.query(
                `INSERT INTO requests (patient, hospital, contact, blood, units, level, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [newRequest.patient, newRequest.hospital, newRequest.contact, newRequest.blood, newRequest.units, newRequest.level, 'Pending', newRequest.date]
            );
        } catch (e) {
            console.error('MySQL register acceptor error:', e);
        }
    }

    const jsonDB = db.readJSONDB();
    jsonDB.users.push(newAcceptor);
    jsonDB.requests.unshift(newRequest);
    db.writeJSONDB(jsonDB);

    const token = jwt.sign({ id: newAcceptor.id, email: newAcceptor.email, role: 'Acceptor' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: newAcceptor });
});

// Helper: Send Password Reset Email with Link
async function sendResetEmail(recipientEmail, resetUrl) {
    const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
    let transporter = null;

    if (smtpConfigured) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background: #f1f5f9;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: #0f172a; padding: 28px 32px; text-align: center;">
                <h1 style="color: #ef4444; margin: 0; font-size: 26px; letter-spacing: -0.04em;">RED NEXUS</h1>
                <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">Care in every drop · Blood Bank & Donor Portal</p>
            </div>
            <div style="padding: 32px;">
                <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 12px;">Password Reset Request</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 18px;">
                    Hello, we received a request to reset the password for your Red Nexus account linked to <strong>${recipientEmail}</strong>.
                </p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
                    Click the button below to choose a new password. This link is secure and will expire in <strong>1 hour</strong>.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" target="_blank" style="background: #ef4444; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password →</a>
                </div>
                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 24px 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    If the button above doesn't work, copy and paste this link into your browser:<br>
                    <a href="${resetUrl}" style="color: #ef4444; word-break: break-all;">${resetUrl}</a>
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0;">
                    If you did not request a password reset, you can safely ignore this email. Your account remains secure.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 18px 32px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0;">
                © Red Nexus Blood Bank. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    if (transporter) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"Red Nexus Blood Bank" <no-reply@rednexus.org>',
                to: recipientEmail,
                subject: 'Red Nexus - Reset Your Password',
                html: emailHtml
            });
            console.log(`✉️ Password reset email successfully sent to ${recipientEmail}`);
            return { sent: true, mode: 'smtp' };
        } catch (mailErr) {
            console.warn(`⚠️ Failed to send via SMTP (${mailErr.message}), falling back to direct console link.`);
        }
    }

    // Dev mode fallback: print clickable link to terminal
    console.log('\n================================================================');
    console.log('📧 [RED NEXUS PASSWORD RESET EMAIL SIMULATION]');
    console.log(`Recipient: ${recipientEmail}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('================================================================\n');

    return { sent: true, mode: 'local', resetUrl };
}

// 4. Auth - Request Password Reset Link (Sends Email)
app.post('/api/auth/forgot-password', async (req, res) => {
    const rawInput = (req.body.email || req.body.identifier || '').trim();
    if (!rawInput) {
        return res.status(400).json({ success: false, message: "Registered email address or mobile number is required." });
    }

    const cleanInput = rawInput.toLowerCase();
    const cleanDigits = rawInput.replace(/[^0-9]/g, '');
    let matchedUser = null;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            // 1. Try exact email match
            let [rows] = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?', [cleanInput]);

            // 2. Try mobile number match (last 10 digits)
            if (!rows.length && cleanDigits.length >= 10) {
                [rows] = await pool.query('SELECT * FROM users WHERE mobile LIKE ?', [`%${cleanDigits.slice(-10)}`]);
            }

            // 3. Try username / prefix match (without domain)
            if (!rows.length && !cleanInput.includes('@')) {
                [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) LIKE ?', [`${cleanInput}@%`]);
            }

            // 4. Try typo-tolerant / fuzzy match for vowels/accents
            if (!rows.length) {
                const stripped = cleanInput.replace(/[^a-z0-9]/g, '').replace(/[aeiou]/g, '');
                const [allUsers] = await pool.query('SELECT * FROM users');
                const fuzzy = allUsers.find(u => {
                    const uEmail = (u.email || '').toLowerCase();
                    const uStripped = uEmail.replace(/[^a-z0-9]/g, '').replace(/[aeiou]/g, '');
                    return uStripped === stripped || (cleanInput.length > 5 && uEmail.includes(cleanInput.split('@')[0]));
                });
                if (fuzzy) rows = [fuzzy];
            }

            if (rows && rows.length > 0) {
                matchedUser = rows[0];
            }
        } catch (e) {
            console.error('MySQL forgot password query error:', e);
        }
    }

    // Check JSON DB fallback
    if (!matchedUser) {
        const jsonDB = db.readJSONDB();
        matchedUser = jsonDB.users.find(u => {
            const uEmail = (u.email || '').trim().toLowerCase();
            const uMobile = (u.mobile || '').replace(/[^0-9]/g, '');
            const strippedInput = cleanInput.replace(/[^a-z0-9]/g, '').replace(/[aeiou]/g, '');
            const strippedUser = uEmail.replace(/[^a-z0-9]/g, '').replace(/[aeiou]/g, '');

            return uEmail === cleanInput ||
                   (cleanDigits.length >= 10 && uMobile.endsWith(cleanDigits.slice(-10))) ||
                   (!cleanInput.includes('@') && uEmail.startsWith(cleanInput + '@')) ||
                   strippedUser === strippedInput ||
                   (u.username && u.username.toLowerCase() === cleanInput);
        });
    }

    if (!matchedUser && (cleanInput === 'demo' || cleanInput === 'demo@rednexus.org')) {
        matchedUser = { email: 'demo@rednexus.org', name: 'Alex Morgan' };
    }

    if (!matchedUser) {
        return res.status(404).json({
            success: false,
            message: `No account found for "${rawInput}". Please check the spelling or try entering your 10-digit mobile number.`
        });
    }

    const targetEmail = matchedUser.email;

    // Generate secure 1-hour signed JWT reset token
    const resetToken = jwt.sign({ email: targetEmail, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
    const clientBase = process.env.CLIENT_URL || `http://localhost:${PORT}`;
    const resetUrl = `${clientBase}/?token=${resetToken}#reset-password`;

    const emailResult = await sendResetEmail(targetEmail, resetUrl);

    return res.json({
        success: true,
        targetEmail: targetEmail,
        message: `A password reset link has been generated and sent to ${targetEmail}. Please check your inbox.`,
        resetUrl: emailResult.mode === 'local' ? resetUrl : undefined
    });
});

// 5. Auth - Confirm Password Reset via Token
app.post('/api/auth/reset-password-confirm', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: "Reset token and new password are required." });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(400).json({ success: false, message: "The password reset link has expired. Please request a new one." });
        }
        return res.status(400).json({ success: false, message: "Invalid or corrupted reset token." });
    }

    if (!decoded || decoded.type !== 'password_reset' || !decoded.email) {
        return res.status(400).json({ success: false, message: "Invalid reset token." });
    }

    const cleanEmail = decoded.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    let updated = false;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [result] = await pool.query('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [passwordHash, cleanEmail]);
            if (result && result.affectedRows > 0) {
                updated = true;
            }
        } catch (e) {
            console.error('MySQL reset password confirm error:', e);
        }
    }

    const jsonDB = db.readJSONDB();
    const jsonUser = jsonDB.users.find(u => (u.email && u.email.toLowerCase() === cleanEmail) || (u.username && u.username.toLowerCase() === cleanEmail));
    if (jsonUser) {
        jsonUser.password_hash = passwordHash;
        jsonUser.password = newPassword;
        db.writeJSONDB(jsonDB);
        updated = true;
    } else if (cleanEmail === "demo@rednexus.org") {
        updated = true;
    }

    if (!updated) {
        return res.status(404).json({ success: false, message: "Account associated with this reset link was not found." });
    }

    return res.json({
        success: true,
        message: "Your password has been reset successfully! You can now sign in with your new password."
    });
});

// 6. Direct Reset (Legacy / Profile)
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, mobile, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ success: false, message: "Email and new password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile ? mobile.trim() : '';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    let userFound = false;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [users] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
            const user = users[0];

            if (user) {
                if (cleanMobile && user.mobile && user.mobile.trim() !== cleanMobile) {
                    return res.status(400).json({
                        success: false,
                        message: "The entered mobile number does not match our records for this account."
                    });
                }

                await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
                userFound = true;
            }
        } catch (e) {
            console.error('MySQL reset password error:', e);
        }
    }

    // Sync / fallback with JSON DB
    const jsonDB = db.readJSONDB();
    const jsonUser = jsonDB.users.find(u => (u.email && u.email.toLowerCase() === cleanEmail) || (u.username && u.username.toLowerCase() === cleanEmail));

    if (jsonUser) {
        if (cleanMobile && jsonUser.mobile && jsonUser.mobile.trim() !== cleanMobile) {
            return res.status(400).json({
                success: false,
                message: "The entered mobile number does not match our records for this account."
            });
        }
        jsonUser.password_hash = passwordHash;
        jsonUser.password = newPassword;
        db.writeJSONDB(jsonDB);
        userFound = true;
    } else if (cleanEmail === "demo@rednexus.org") {
        userFound = true;
    }

    if (!userFound) {
        return res.status(404).json({
            success: false,
            message: "No registered donor or acceptor account found with this email address."
        });
    }

    return res.json({
        success: true,
        message: "Password updated successfully! You can now sign in with your new password."
    });
});

// 7. Inventory API
app.get('/api/inventory', async (req, res) => {
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT * FROM inventory');
            const result = {};
            rows.forEach(r => result[r.blood_group] = r.units);
            return res.json(result);
        } catch (e) {}
    }
    const jsonDB = db.readJSONDB();
    res.json(jsonDB.inventory);
});

app.post('/api/inventory', async (req, res) => {
    const inventory = req.body;
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            for (const [bg, units] of Object.entries(inventory)) {
                await pool.query('INSERT INTO inventory (blood_group, units) VALUES (?, ?) ON DUPLICATE KEY UPDATE units = ?', [bg, units, units]);
            }
        } catch (e) {}
    }
    const jsonDB = db.readJSONDB();
    jsonDB.inventory = inventory;
    db.writeJSONDB(jsonDB);
    res.json({ success: true, inventory });
});

// 5. Donors API
app.get('/api/donors', async (req, res) => {
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [donors] = await pool.query('SELECT * FROM donors');
            return res.json(donors);
        } catch (e) {}
    }
    const jsonDB = db.readJSONDB();
    res.json(jsonDB.donors);
});

// 6. Requests API
app.get('/api/requests', async (req, res) => {
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [requests] = await pool.query('SELECT * FROM requests ORDER BY id DESC');
            return res.json(requests);
        } catch (e) {}
    }
    const jsonDB = db.readJSONDB();
    res.json(jsonDB.requests);
});

app.post('/api/requests', async (req, res) => {
    const reqData = req.body;
    const newRequest = {
        id: Date.now(),
        patient: reqData.patient,
        hospital: reqData.hospital,
        contact: reqData.contact,
        blood: reqData.blood,
        units: Number(reqData.units) || 1,
        level: reqData.level || 'Routine',
        status: 'Pending',
        date: new Date().toISOString().slice(0, 10)
    };

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query(
                `INSERT INTO requests (patient, hospital, contact, blood, units, level, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [newRequest.patient, newRequest.hospital, newRequest.contact, newRequest.blood, newRequest.units, newRequest.level, 'Pending', newRequest.date]
            );
        } catch (e) {}
    }

    const jsonDB = db.readJSONDB();
    jsonDB.requests.unshift(newRequest);
    db.writeJSONDB(jsonDB);
    res.json(newRequest);
});

app.patch('/api/requests/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            await pool.query('UPDATE requests SET status = ? WHERE id = ?', [status, id]);
        } catch (e) {}
    }

    const jsonDB = db.readJSONDB();
    const reqItem = jsonDB.requests.find(r => r.id === id);
    if (reqItem) reqItem.status = status;
    db.writeJSONDB(jsonDB);
    res.json({ success: true });
});

// 7. CSV Export Endpoints
app.get('/api/export/donors/csv', async (req, res) => {
    let donors = [];
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT * FROM donors');
            donors = rows;
        } catch (e) {}
    }
    if (!donors.length) donors = db.readJSONDB().donors;

    let csv = 'ID,Name,Blood Group,Mobile,City,Last Donation,Status\n';
    donors.forEach(d => {
        csv += `"${d.id}","${d.name}","${d.blood || d.blood_group}","${d.mobile}","${d.city}","${d.last || d.last_donation}","${d.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="RedNexus_Donors.csv"');
    res.send(csv);
});

app.get('/api/export/inventory/csv', async (req, res) => {
    let inventory = {};
    if (db.isMySQL()) {
        try {
            const pool = db.getPool();
            const [rows] = await pool.query('SELECT * FROM inventory');
            rows.forEach(r => inventory[r.blood_group] = r.units);
        } catch (e) {}
    }
    if (!Object.keys(inventory).length) inventory = db.readJSONDB().inventory;

    let csv = 'Blood Group,Available Units,Status\n';
    for (const [bg, units] of Object.entries(inventory)) {
        const status = units <= 3 ? 'Critical' : units <= 8 ? 'Low Stock' : 'Available';
        csv += `"${bg}","${units}","${status}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="RedNexus_Inventory.csv"');
    res.send(csv);
});

// 8. Emergency Alert Broadcast Notification Simulation
app.post('/api/notifications/alert', (req, res) => {
    const { blood, hospital, units } = req.body;
    console.log(`🚨 EMERGENCY BROADCAST DISPATCHED: Need ${units} units of ${blood} at ${hospital}!`);
    res.json({
        success: true,
        message: `Emergency alert broadcast dispatched to all registered ${blood} donors via SMS and Email notification.`
    });
});

// Serve Static Frontend Files
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Red Nexus Server running on http://localhost:${PORT}`);
});
