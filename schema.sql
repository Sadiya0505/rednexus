-- Red Nexus Blood Bank MySQL Schema
CREATE DATABASE IF NOT EXISTS rednexus_db;
USE rednexus_db;

-- 1. Users Table
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

-- 2. Donors Table
CREATE TABLE IF NOT EXISTS donors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    city VARCHAR(100),
    last_donation VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Eligible'
);

-- 3. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    blood_group VARCHAR(10) PRIMARY KEY,
    units INT DEFAULT 0
);

-- Seed Default Inventory if empty
INSERT INTO inventory (blood_group, units) VALUES
('A+', 25), ('A-', 12), ('B+', 8), ('B-', 5),
('AB+', 14), ('AB-', 4), ('O+', 3), ('O-', 9), ('Bombay', 2)
ON DUPLICATE KEY UPDATE units=units;

-- 4. Requests Table
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

-- Seed Sample Request
INSERT INTO requests (patient, hospital, contact, blood, units, level, status, date)
VALUES ('Harper James', 'St. Mary''s Medical Center', '9898989898', 'O-', 3, 'Critical', 'Pending', '2026-08-26')
ON DUPLICATE KEY UPDATE id=id;
