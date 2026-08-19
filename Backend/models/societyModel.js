const db = require("../config/db.js");

const initSocietyModel = async () => {
    // 1. Create societies table
    const createSocietiesTable = `
        CREATE TABLE IF NOT EXISTS societies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            society_image VARCHAR(255) DEFAULT NULL,
            society_name VARCHAR(255) NOT NULL,
            society_code VARCHAR(50) NOT NULL UNIQUE,
            registration_number VARCHAR(100) DEFAULT NULL,
            society_status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
            street_address TEXT DEFAULT NULL,
            city VARCHAR(100) DEFAULT NULL,
            state VARCHAR(100) DEFAULT NULL,
            pincode VARCHAR(20) DEFAULT NULL,
            office_contact VARCHAR(50) DEFAULT NULL,
            admin_email VARCHAR(150) DEFAULT NULL,
            security_emergency_contact VARCHAR(50) DEFAULT NULL,
            type ENUM('flat', 'bungalow', 'both') DEFAULT 'both',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;

    // 2. Create buildings table
    const createBuildingsTable = `
        CREATE TABLE IF NOT EXISTS buildings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            society_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(50) NOT NULL,
            total_floors INT DEFAULT 1,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
            UNIQUE KEY uq_society_building_code (society_id, code)
        )
    `;

    // 3. Create floors table
    const createFloorsTable = `
        CREATE TABLE IF NOT EXISTS floors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            building_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            num_flats INT DEFAULT 0,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
        )
    `;

    await db.execute(createSocietiesTable);
    await db.execute(createBuildingsTable);
    await db.execute(createFloorsTable);
    console.log("Society, Buildings, and Floors tables initialized successfully.");
};

module.exports = {
    initSocietyModel
};
