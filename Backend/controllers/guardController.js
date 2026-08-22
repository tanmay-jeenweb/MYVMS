const fs = require("fs");
const path = require("path");
const db = require("../config/db.js");
const { uploadDir, getFileUrl } = require("../config/uploadConfig");
const { createAuditLog } = require("../models/auditLogModel.js");

// Simple in-memory store for guard OTPs
// Maps: mobile_number -> { otp, expiresAt }
const otpStore = new Map();

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates 6-digit OTP
};

// Helper to delete a file from the disk
const deleteDocFile = (filename) => {
    if (!filename) return;
    try {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted document: ${filePath}`);
        }
    } catch (err) {
        console.error(`Failed to delete document ${filename}:`, err.message);
    }
};

// ─── GET ALL GUARDS ───────────────────────────────────────────────────────────
const getGuards = async (req, res) => {
    try {
        const query = `
            SELECT g.*, gt.gate_name 
            FROM guards g
            LEFT JOIN gates gt ON g.gate_id = gt.id
            ORDER BY g.created_at DESC
        `;
        const [rows] = await db.execute(query);

        const guards = rows.map(g => ({
            ...g,
            id_proof_doc_url: g.id_proof_doc ? getFileUrl(g.id_proof_doc) : null
        }));

        return res.status(200).json({
            success: true,
            data: guards
        });
    } catch (error) {
        console.error("Get Guards Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── GET GUARD BY ID ─────────────────────────────────────────────────────────
const getGuardById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT g.*, gt.gate_name 
            FROM guards g
            LEFT JOIN gates gt ON g.gate_id = gt.id
            WHERE g.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Guard not found" });
        }

        const guard = rows[0];
        guard.id_proof_doc_url = guard.id_proof_doc ? getFileUrl(guard.id_proof_doc) : null;

        return res.status(200).json({
            success: true,
            data: guard
        });
    } catch (error) {
        console.error("Get Guard By Id Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── CREATE GUARD ─────────────────────────────────────────────────────────────
const addGuard = async (req, res) => {
    try {
        const {
            full_name,
            mobile_number,
            mobile_number_verified,
            security_agency,
            id_proof_ref,
            joining_date,
            status
        } = req.body;

        if (!full_name || !mobile_number || !security_agency || !id_proof_ref || !joining_date) {
            if (req.file) deleteDocFile(req.file.filename);
            return res.status(400).json({
                success: false,
                message: "Full Name, Mobile Number, Security Agency, ID Proof Ref, and Joining Date are required"
            });
        }

        // Set document filename if uploaded
        const id_proof_doc = req.file ? req.file.filename : null;

        const insertQuery = `
            INSERT INTO guards (
                full_name, mobile_number, mobile_number_verified, security_agency, 
                id_proof_ref, id_proof_doc, joining_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(insertQuery, [
            full_name.trim(),
            mobile_number.trim(),
            mobile_number_verified ? Number(mobile_number_verified) : 0,
            security_agency.trim(),
            id_proof_ref.trim(),
            id_proof_doc,
            joining_date,
            status || 'active'
        ]);

        const newId = result.insertId;

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Guard Master',
            'created',
            null,
            {
                id: newId,
                full_name: full_name.trim(),
                mobile_number: mobile_number.trim(),
                mobile_number_verified: mobile_number_verified ? Number(mobile_number_verified) : 0,
                security_agency: security_agency.trim(),
                id_proof_ref: id_proof_ref.trim(),
                id_proof_doc,
                joining_date,
                status: status || 'active'
            }
        );

        return res.status(201).json({
            success: true,
            message: "Guard created successfully",
            data: { id: newId }
        });
    } catch (error) {
        if (req.file) deleteDocFile(req.file.filename);
        console.error("Create Guard Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── UPDATE GUARD ─────────────────────────────────────────────────────────────
const updateGuard = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name,
            mobile_number,
            mobile_number_verified,
            security_agency,
            id_proof_ref,
            joining_date,
            status,
            removeDoc
        } = req.body;

        if (!full_name || !mobile_number || !security_agency || !id_proof_ref || !joining_date) {
            if (req.file) deleteDocFile(req.file.filename);
            return res.status(400).json({
                success: false,
                message: "Full Name, Mobile Number, Security Agency, ID Proof Ref, and Joining Date are required"
            });
        }

        // Check if guard exists
        const [existingRows] = await db.execute(`SELECT * FROM guards WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            if (req.file) deleteDocFile(req.file.filename);
            return res.status(404).json({ success: false, message: "Guard not found" });
        }
        const existingGuard = existingRows[0];

        // Handle Document Update
        let id_proof_doc = existingGuard.id_proof_doc;
        if (req.file) {
            // New file uploaded, delete old one
            deleteDocFile(existingGuard.id_proof_doc);
            id_proof_doc = req.file.filename;
        } else if (removeDoc === 'true') {
            // Document explicitly removed
            deleteDocFile(existingGuard.id_proof_doc);
            id_proof_doc = null;
        }

        const updateQuery = `
            UPDATE guards SET
                full_name = ?,
                mobile_number = ?,
                mobile_number_verified = ?,
                security_agency = ?,
                id_proof_ref = ?,
                id_proof_doc = ?,
                joining_date = ?,
                status = ?
            WHERE id = ?
        `;

        await db.execute(updateQuery, [
            full_name.trim(),
            mobile_number.trim(),
            mobile_number_verified ? Number(mobile_number_verified) : 0,
            security_agency.trim(),
            id_proof_ref.trim(),
            id_proof_doc,
            joining_date,
            status || 'active',
            id
        ]);

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Guard Master',
            'updated',
            {
                id: Number(id),
                full_name: existingGuard.full_name,
                mobile_number: existingGuard.mobile_number,
                mobile_number_verified: existingGuard.mobile_number_verified,
                security_agency: existingGuard.security_agency,
                id_proof_ref: existingGuard.id_proof_ref,
                id_proof_doc: existingGuard.id_proof_doc,
                joining_date: existingGuard.joining_date,
                status: existingGuard.status
            },
            {
                id: Number(id),
                full_name: full_name.trim(),
                mobile_number: mobile_number.trim(),
                mobile_number_verified: mobile_number_verified ? Number(mobile_number_verified) : 0,
                security_agency: security_agency.trim(),
                id_proof_ref: id_proof_ref.trim(),
                id_proof_doc,
                joining_date,
                status: status || 'active'
            }
        );

        return res.status(200).json({
            success: true,
            message: "Guard updated successfully"
        });
    } catch (error) {
        if (req.file) deleteDocFile(req.file.filename);
        console.error("Update Guard Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── DELETE GUARD ─────────────────────────────────────────────────────────────
const deleteGuard = async (req, res) => {
    try {
        const { id } = req.params;

        const [existingRows] = await db.execute(`SELECT * FROM guards WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ success: false, message: "Guard not found" });
        }
        const existingGuard = existingRows[0];

        await db.execute(`DELETE FROM guards WHERE id = ?`, [id]);

        // Delete file from disk
        if (existingGuard.id_proof_doc) {
            deleteDocFile(existingGuard.id_proof_doc);
        }

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Guard Master',
            'deleted',
            {
                id: Number(id),
                full_name: existingGuard.full_name,
                mobile_number: existingGuard.mobile_number,
                mobile_number_verified: existingGuard.mobile_number_verified,
                security_agency: existingGuard.security_agency,
                id_proof_ref: existingGuard.id_proof_ref,
                id_proof_doc: existingGuard.id_proof_doc,
                joining_date: existingGuard.joining_date,
                status: existingGuard.status
            },
            null
        );

        return res.status(200).json({
            success: true,
            message: "Guard deleted successfully"
        });
    } catch (error) {
        console.error("Delete Guard Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── ASSIGN GATE TO GUARD ─────────────────────────────────────────────────────
const assignGate = async (req, res) => {
    try {
        const { id } = req.params;
        const { gate_id } = req.body; // Can be null or id

        // Verify guard exists
        const [guardRows] = await db.execute(`SELECT * FROM guards WHERE id = ?`, [id]);
        if (guardRows.length === 0) {
            return res.status(404).json({ success: false, message: "Guard not found" });
        }
        const existingGuard = guardRows[0];

        // If gate_id is provided, verify gate exists
        if (gate_id) {
            const [gateRows] = await db.execute(`SELECT * FROM gates WHERE id = ?`, [gate_id]);
            if (gateRows.length === 0) {
                return res.status(404).json({ success: false, message: "Gate not found" });
            }
        }

        await db.execute(`UPDATE guards SET gate_id = ? WHERE id = ?`, [gate_id || null, id]);

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Guard Master',
            'updated',
            { id: Number(id), full_name: existingGuard.full_name, gate_id: existingGuard.gate_id },
            { id: Number(id), full_name: existingGuard.full_name, gate_id: gate_id ? Number(gate_id) : null }
        );

        return res.status(200).json({
            success: true,
            message: "Gate assigned to guard successfully"
        });
    } catch (error) {
        console.error("Assign Gate Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── SEND OTP ────────────────────────────────────────────────────────────────
const sendOtp = async (req, res) => {
    try {
        const { mobile_number } = req.body;
        if (!mobile_number) {
            return res.status(400).json({ success: false, message: "Guard mobile number is required" });
        }

        const otp = generateOtp();
        const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes

        otpStore.set(mobile_number, { otp, expiresAt });

        // Log OTP to server console (per user request)
        console.log(`\n===========================================`);
        console.log(`[OTP Verification] Guard Mobile: ${mobile_number}`);
        console.log(`[OTP Verification] OTP Code: ${otp}`);
        console.log(`===========================================\n`);

        // Write OTP to a temporary file for testing purposes
        try {
            const fs = require("fs");
            const path = require("path");
            fs.writeFileSync(path.join(__dirname, "../temp_otp_guard.txt"), otp);
        } catch (fsErr) {
            console.error("Failed to write temp OTP file:", fsErr);
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully (check backend console)"
        });
    } catch (error) {
        console.error("Send OTP Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── VERIFY OTP ─────────────────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
    try {
        const { mobile_number, otp } = req.body;
        if (!mobile_number || !otp) {
            return res.status(400).json({ success: false, message: "Guard mobile number and OTP are required" });
        }

        const record = otpStore.get(mobile_number);
        if (!record) {
            return res.status(400).json({ success: false, message: "OTP not sent or expired" });
        }

        if (Date.now() > record.expiresAt) {
            otpStore.delete(mobile_number);
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        if (record.otp !== otp.toString()) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // Verification successful, remove OTP from store
        otpStore.delete(mobile_number);

        return res.status(200).json({
            success: true,
            message: "Mobile number verified successfully"
        });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    getGuards,
    getGuardById,
    addGuard,
    updateGuard,
    deleteGuard,
    assignGate,
    sendOtp,
    verifyOtp
};
