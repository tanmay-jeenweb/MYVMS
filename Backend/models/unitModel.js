const db = require("../config/db.js");

const initUnitModel = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS units (
            id INT AUTO_INCREMENT PRIMARY KEY,
            society_id INT NOT NULL,
            building_id INT DEFAULT NULL,
            floor_id INT DEFAULT NULL,
            unit_category ENUM('flat', 'bungalow') NOT NULL,
            unit_number VARCHAR(50) NOT NULL,
            type ENUM('2BHK', '3BHK', '4BHK', 'Penthouse') NOT NULL,
            area VARCHAR(50) DEFAULT NULL,
            occupancy ENUM('Self Occupied', 'Rented', 'Vacant') DEFAULT 'Vacant',
            status ENUM('active', 'inactive') DEFAULT 'active',
            owner_name VARCHAR(255) DEFAULT NULL,
            owner_number VARCHAR(50) DEFAULT NULL,
            owner_number_verified TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
            FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);

    // Check if column exists, if not ALTER TABLE
    try {
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'units' 
              AND COLUMN_NAME = 'unit_category'
        `);
        if (columns.length === 0) {
            await db.execute(`
                ALTER TABLE units 
                ADD COLUMN unit_category ENUM('flat', 'bungalow') NOT NULL AFTER floor_id
            `);
            console.log("Units table altered to add unit_category column.");
        }
    } catch (err) {
        console.error("Error altering units table for category:", err);
    }

    // Check if owner_name and owner_number columns exist, if not ALTER TABLE
    try {
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'units' 
              AND COLUMN_NAME = 'owner_name'
        `);
        if (columns.length === 0) {
            await db.execute(`
                ALTER TABLE units 
                ADD COLUMN owner_name VARCHAR(255) DEFAULT NULL AFTER status,
                ADD COLUMN owner_number VARCHAR(50) DEFAULT NULL AFTER owner_name
            `);
            console.log("Units table altered to add owner_name and owner_number columns.");
        }
    } catch (err) {
        console.error("Error altering units table for owner details:", err);
    }

    // Check if owner_number_verified column exists, if not ALTER TABLE
    try {
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'units' 
              AND COLUMN_NAME = 'owner_number_verified'
        `);
        if (columns.length === 0) {
            await db.execute(`
                ALTER TABLE units 
                ADD COLUMN owner_number_verified TINYINT(1) DEFAULT 0 AFTER owner_number
            `);
            console.log("Units table altered to add owner_number_verified column.");
        }
    } catch (err) {
        console.error("Error altering units table for owner_number_verified:", err);
    }

    console.log("Units table initialized successfully.");
};

module.exports = {
    initUnitModel
};
