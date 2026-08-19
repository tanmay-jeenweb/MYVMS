const db = require("../config/db.js");

const initGateModel = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS gates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            gate_name VARCHAR(255) NOT NULL UNIQUE,
            gate_type ENUM('Main gate', 'secondary gate', 'service gate', 'emergancy gate') NOT NULL,
            location_description TEXT DEFAULT NULL,
            allow_visitor_entry TINYINT(1) DEFAULT 0,
            allow_staff_entry TINYINT(1) DEFAULT 0,
            qr_scanner_enabled TINYINT(1) DEFAULT 0,
            otp_entry_enabled TINYINT(1) DEFAULT 0,
            opening_time TIME DEFAULT NULL,
            closing_time TIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;

    await db.execute(query);
    console.log("Gates table initialized successfully.");
};

module.exports = {
    initGateModel
};
