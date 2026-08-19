const db = require("../config/db.js");

const initGuardModel = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS guards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            mobile_number VARCHAR(50) NOT NULL,
            security_agency VARCHAR(255) NOT NULL,
            id_proof_ref VARCHAR(255) NOT NULL,
            id_proof_doc VARCHAR(255) DEFAULT NULL,
            gate_id INT DEFAULT NULL,
            joining_date DATE NOT NULL,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE SET NULL
        )
    `;

    await db.execute(query);

    try {
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'guards' 
              AND COLUMN_NAME = 'gate_id'
        `);
        if (columns.length === 0) {
            await db.execute(`
                ALTER TABLE guards 
                ADD COLUMN gate_id INT DEFAULT NULL AFTER id_proof_doc
            `);
            await db.execute(`
                ALTER TABLE guards
                ADD CONSTRAINT fk_guard_gate FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE SET NULL
            `);
            console.log("Guards table altered to add gate_id column.");
        }
    } catch (err) {
        console.error("Error altering guards table:", err);
    }

    console.log("Guards table initialized successfully.");
};

module.exports = {
    initGuardModel
};
