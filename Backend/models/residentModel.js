const db = require("../config/db.js");

const initResidentModel = async () => {
    // 1. Alter units table occupancy column to support 'Self Occupied & Rented'
    try {
        await db.execute(`
            ALTER TABLE units 
            MODIFY COLUMN occupancy ENUM('Self Occupied', 'Rented', 'Vacant', 'Self Occupied & Rented') DEFAULT 'Vacant'
        `);
        console.log("Units table altered to support 'Self Occupied & Rented' occupancy.");
    } catch (err) {
        console.log("Units table occupancy alteration skipped or already run:", err.message);
    }

    // 2. Drop existing residents and resident_members tables to recreate with new schema cleanly
    // (Since we are in development, dropping and recreating is safer to avoid schema mismatch)
    try {
        await db.execute("DROP TABLE IF EXISTS resident_members");
        await db.execute("DROP TABLE IF EXISTS residents");
        console.log("Old resident tables dropped successfully for schema reset.");
    } catch (err) {
        console.warn("Could not drop old resident tables:", err.message);
    }

    // 3. Create updated residents table
    const createResidentsTable = `
        CREATE TABLE IF NOT EXISTS residents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            unit_id INT NOT NULL UNIQUE,
            has_owner TINYINT(1) DEFAULT 1,
            owner_name VARCHAR(255) DEFAULT NULL,
            owner_mobile VARCHAR(50) DEFAULT NULL,
            owner_email VARCHAR(150) DEFAULT NULL,
            owner_move_in_date DATE DEFAULT NULL,
            owner_id_proof VARCHAR(255) DEFAULT NULL,
            owner_emergency_contact VARCHAR(100) DEFAULT NULL,
            owner_status ENUM('active', 'inactive') DEFAULT 'active',
            has_tenant TINYINT(1) DEFAULT 0,
            tenant_name VARCHAR(255) DEFAULT NULL,
            tenant_mobile VARCHAR(50) DEFAULT NULL,
            tenant_email VARCHAR(150) DEFAULT NULL,
            tenant_move_in_date DATE DEFAULT NULL,
            tenant_id_proof VARCHAR(255) DEFAULT NULL,
            tenant_emergency_contact VARCHAR(100) DEFAULT NULL,
            tenant_status ENUM('active', 'inactive') DEFAULT 'active',
            rent_agreement VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
        )
    `;

    // 4. Create updated resident_members table
    const createResidentMembersTable = `
        CREATE TABLE IF NOT EXISTS resident_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            resident_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            mobile_number VARCHAR(50) DEFAULT NULL,
            email VARCHAR(150) DEFAULT NULL,
            id_proof VARCHAR(255) DEFAULT NULL,
            emergency_contact VARCHAR(100) DEFAULT NULL,
            member_type ENUM('Family Member', 'Tenant') NOT NULL,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
        )
    `;

    await db.execute(createResidentsTable);
    await db.execute(createResidentMembersTable);
    console.log("Residents and Resident Members tables initialized successfully with co-habitation schema.");
};

module.exports = {
    initResidentModel
};
