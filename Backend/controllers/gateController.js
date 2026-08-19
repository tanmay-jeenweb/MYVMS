const db = require("../config/db.js");
const { createAuditLog } = require("../models/auditLogModel.js");

// ─── GET ALL GATES ────────────────────────────────────────────────────────────
const getGates = async (req, res) => {
    try {
        const query = `
            SELECT g.*, GROUP_CONCAT(gu.full_name SEPARATOR ', ') AS assigned_guards
            FROM gates g
            LEFT JOIN guards gu ON gu.gate_id = g.id
            GROUP BY g.id
            ORDER BY g.created_at DESC
        `;
        const [rows] = await db.execute(query);

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Get Gates Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── GET GATE BY ID ──────────────────────────────────────────────────────────
const getGateById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT g.*, GROUP_CONCAT(gu.full_name SEPARATOR ', ') AS assigned_guards
            FROM gates g
            LEFT JOIN guards gu ON gu.gate_id = g.id
            WHERE g.id = ?
            GROUP BY g.id
        `;
        const [rows] = await db.execute(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Gate not found" });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error("Get Gate By Id Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── CREATE GATE ──────────────────────────────────────────────────────────────
const addGate = async (req, res) => {
    try {
        const {
            gate_name,
            gate_type,
            location_description,
            allow_visitor_entry,
            allow_staff_entry,
            qr_scanner_enabled,
            otp_entry_enabled,
            opening_time,
            closing_time
        } = req.body;

        if (!gate_name || !gate_type) {
            return res.status(400).json({
                success: false,
                message: "Gate Name and Gate Type are required"
            });
        }

        // Check if gate name is unique
        const [existing] = await db.execute(
            `SELECT id FROM gates WHERE gate_name = ?`,
            [gate_name.trim()]
        );
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Gate Name '${gate_name}' already exists`
            });
        }

        const insertQuery = `
            INSERT INTO gates (
                gate_name, gate_type, location_description, 
                allow_visitor_entry, allow_staff_entry, 
                qr_scanner_enabled, otp_entry_enabled, 
                opening_time, closing_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(insertQuery, [
            gate_name.trim(),
            gate_type,
            location_description || null,
            allow_visitor_entry ? 1 : 0,
            allow_staff_entry ? 1 : 0,
            qr_scanner_enabled ? 1 : 0,
            otp_entry_enabled ? 1 : 0,
            opening_time || null,
            closing_time || null
        ]);

        const newId = result.insertId;

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Gate Master',
            'created',
            null,
            {
                id: newId,
                gate_name: gate_name.trim(),
                gate_type,
                location_description,
                allow_visitor_entry: !!allow_visitor_entry,
                allow_staff_entry: !!allow_staff_entry,
                qr_scanner_enabled: !!qr_scanner_enabled,
                otp_entry_enabled: !!otp_entry_enabled,
                opening_time,
                closing_time
            }
        );

        return res.status(201).json({
            success: true,
            message: "Gate created successfully",
            data: { id: newId }
        });
    } catch (error) {
        console.error("Create Gate Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── UPDATE GATE ──────────────────────────────────────────────────────────────
const updateGate = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            gate_name,
            gate_type,
            location_description,
            allow_visitor_entry,
            allow_staff_entry,
            qr_scanner_enabled,
            otp_entry_enabled,
            opening_time,
            closing_time
        } = req.body;

        if (!gate_name || !gate_type) {
            return res.status(400).json({
                success: false,
                message: "Gate Name and Gate Type are required"
            });
        }

        // Check if gate exists
        const [existingRows] = await db.execute(`SELECT * FROM gates WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ success: false, message: "Gate not found" });
        }
        const existingGate = existingRows[0];

        // Check uniqueness of new name
        const [dupRows] = await db.execute(
            `SELECT id FROM gates WHERE gate_name = ? AND id != ?`,
            [gate_name.trim(), id]
        );
        if (dupRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Gate Name '${gate_name}' already exists`
            });
        }

        const updateQuery = `
            UPDATE gates SET
                gate_name = ?,
                gate_type = ?,
                location_description = ?,
                allow_visitor_entry = ?,
                allow_staff_entry = ?,
                qr_scanner_enabled = ?,
                otp_entry_enabled = ?,
                opening_time = ?,
                closing_time = ?
            WHERE id = ?
        `;

        await db.execute(updateQuery, [
            gate_name.trim(),
            gate_type,
            location_description || null,
            allow_visitor_entry ? 1 : 0,
            allow_staff_entry ? 1 : 0,
            qr_scanner_enabled ? 1 : 0,
            otp_entry_enabled ? 1 : 0,
            opening_time || null,
            closing_time || null,
            id
        ]);

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Gate Master',
            'updated',
            {
                id: Number(id),
                gate_name: existingGate.gate_name,
                gate_type: existingGate.gate_type,
                location_description: existingGate.location_description,
                allow_visitor_entry: !!existingGate.allow_visitor_entry,
                allow_staff_entry: !!existingGate.allow_staff_entry,
                qr_scanner_enabled: !!existingGate.qr_scanner_enabled,
                otp_entry_enabled: !!existingGate.otp_entry_enabled,
                opening_time: existingGate.opening_time,
                closing_time: existingGate.closing_time
            },
            {
                id: Number(id),
                gate_name: gate_name.trim(),
                gate_type,
                location_description,
                allow_visitor_entry: !!allow_visitor_entry,
                allow_staff_entry: !!allow_staff_entry,
                qr_scanner_enabled: !!qr_scanner_enabled,
                otp_entry_enabled: !!otp_entry_enabled,
                opening_time,
                closing_time
            }
        );

        return res.status(200).json({
            success: true,
            message: "Gate updated successfully"
        });
    } catch (error) {
        console.error("Update Gate Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── DELETE GATE ──────────────────────────────────────────────────────────────
const deleteGate = async (req, res) => {
    try {
        const { id } = req.params;

        const [existingRows] = await db.execute(`SELECT * FROM gates WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ success: false, message: "Gate not found" });
        }
        const existingGate = existingRows[0];

        await db.execute(`DELETE FROM gates WHERE id = ?`, [id]);

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Gate Master',
            'deleted',
            {
                id: Number(id),
                gate_name: existingGate.gate_name,
                gate_type: existingGate.gate_type,
                location_description: existingGate.location_description,
                allow_visitor_entry: !!existingGate.allow_visitor_entry,
                allow_staff_entry: !!existingGate.allow_staff_entry,
                qr_scanner_enabled: !!existingGate.qr_scanner_enabled,
                otp_entry_enabled: !!existingGate.otp_entry_enabled,
                opening_time: existingGate.opening_time,
                closing_time: existingGate.closing_time
            },
            null
        );

        return res.status(200).json({
            success: true,
            message: "Gate deleted successfully"
        });
    } catch (error) {
        console.error("Delete Gate Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    getGates,
    getGateById,
    addGate,
    updateGate,
    deleteGate
};
