const db = require('../config/db.js');

const createAuditLogsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            username VARCHAR(255) DEFAULT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            master_name VARCHAR(255) NOT NULL,
            change_type VARCHAR(50) NOT NULL,
            before_data TEXT,
            after_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            in_process_franchise_id INT DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `;

    await db.execute(query);

    try {
        await db.execute(`
            ALTER TABLE audit_logs 
            ADD COLUMN in_process_franchise_id INT DEFAULT NULL
        `);
        console.log('Added in_process_franchise_id to audit_logs table');
    } catch (err) {
        // Suppress column already exists error
    }

    console.log('Audit logs table ready');
};

const createAuditLog = async (
    userId,
    username,
    deviceId,
    masterName,
    changeType,
    beforeData = null,
    afterData = null,
    inProcessFranchiseId = null
) => {
    const query = `
        INSERT INTO audit_logs
            (user_id, username, device_id, master_name, change_type, before_data, after_data, in_process_franchise_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
        userId ?? null,
        username ?? null,
        deviceId ?? null,
        masterName ?? null,
        changeType ?? null,
        beforeData ? JSON.stringify(beforeData) : null,
        afterData ? JSON.stringify(afterData) : null,
        inProcessFranchiseId ?? null
    ]);

    return result;
};

const getAllAuditLogs = async (userId = null) => {
    let query = `
        SELECT id, user_id, username, device_id, master_name, change_type, before_data, after_data, created_at, in_process_franchise_id
        FROM audit_logs
    `;
    let params = [];
    if (userId) {
        query += ` WHERE user_id = ?`;
        params.push(userId);
    }
    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(query, params);

    return rows.map((row) => ({
        ...row,
        before_data: row.before_data ? JSON.parse(row.before_data) : null,
        after_data: row.after_data ? JSON.parse(row.after_data) : null,
    }));
};

const getAuditLogsByFranchiseId = async (franchiseId) => {
    const query = `
        SELECT id, user_id, username, device_id, master_name, change_type, before_data, after_data, created_at, in_process_franchise_id
        FROM audit_logs
        WHERE in_process_franchise_id = ?
           OR (master_name LIKE 'In Process Franchise%' AND (
               before_data LIKE ? OR after_data LIKE ? 
               OR before_data LIKE ? OR after_data LIKE ?
               OR (master_name = 'In Process Franchise' AND (before_data LIKE ? OR after_data LIKE ?))
           ))
           OR (master_name LIKE 'Franchise%' AND (
               before_data LIKE ? OR after_data LIKE ?
               OR before_data LIKE ? OR after_data LIKE ?
           ))
        ORDER BY created_at DESC
    `;
    
    const patternId1 = `%"inProcessFranchiseId":${franchiseId}%`;
    const patternId2 = `%"in_process_franchise_id":${franchiseId}%`;
    const patternId3 = `%"id":${franchiseId}%`;
    
    const [rows] = await db.execute(query, [
        franchiseId,
        patternId1, patternId1,
        patternId2, patternId2,
        patternId3, patternId3,
        patternId1, patternId1,
        patternId2, patternId2
    ]);

    return rows.map((row) => ({
        ...row,
        before_data: row.before_data ? JSON.parse(row.before_data) : null,
        after_data: row.after_data ? JSON.parse(row.after_data) : null,
    }));
};

module.exports = {
    createAuditLogsTable,
    createAuditLog,
    getAllAuditLogs,
    getAuditLogsByFranchiseId,
};
