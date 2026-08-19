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
        console.error("Error altering units table:", err);
    }

    console.log("Units table initialized successfully.");
};

module.exports = {
    initUnitModel
};
