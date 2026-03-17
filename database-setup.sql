# MySQL Database Setup Script
# Run this in MySQL Workbench or command line to set up the database
CREATE DATABASE IF NOT EXISTS gig_shield;
USE gig_shield;
# The tables will be created automatically by Sequelize when the server starts
# with the sync option enabled
# If you need to manually create tables, here are the basic structures:
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('worker', 'admin') DEFAULT 'worker',
    occupation VARCHAR(255),
    location VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    type VARCHAR(255) NOT NULL,
    premium DECIMAL(10, 2) NOT NULL,
    coverage DECIMAL(10, 2) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id)
);
CREATE TABLE IF NOT EXISTS Claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    policyId INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    processedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id),
    FOREIGN KEY (policyId) REFERENCES Policies(id)
);
CREATE TABLE IF NOT EXISTS RiskZones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location VARCHAR(255) NOT NULL UNIQUE,
    riskLevel ENUM('low', 'medium', 'high') NOT NULL,
    weatherConditions JSON,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);