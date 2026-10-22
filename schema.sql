-- Red Nexus Blood Bank – Full Schema (v2)
-- Run this only on a fresh database. For existing databases, db.js handles migrations.
CREATE DATABASE IF NOT EXISTS rednexus_db;
USE rednexus_db;

-- 1. Blood Banks (must exist before users and inventory)
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

-- 2. Users
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
    reset_token_hash VARCHAR(255) NULL,
    reset_expires BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES blood_banks(id) ON DELETE SET NULL
);

-- 3. Donors
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

-- 4. Inventory (scoped per blood bank)
CREATE TABLE IF NOT EXISTS inventory (
    bank_id VARCHAR(50) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    units INT DEFAULT 0,
    PRIMARY KEY (bank_id, blood_group),
    FOREIGN KEY (bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
);

-- 5. Audit Logs
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

-- 6. Blood Requests
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

-- Sample data
INSERT INTO requests (patient, hospital, contact, blood, units, level, status, date)
VALUES ('Harper James', 'St. Mary''s Medical Center', '9898989898', 'O-', 3, 'Critical', 'Pending', '2026-08-26')
ON DUPLICATE KEY UPDATE id=id;
