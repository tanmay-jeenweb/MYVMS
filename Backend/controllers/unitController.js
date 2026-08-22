const db = require("../config/db.js");
const { createAuditLog } = require("../models/auditLogModel.js");

// Simple in-memory store for OTPs
// Maps: owner_number -> { otp, expiresAt }
const otpStore = new Map();

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates 6-digit OTP
};


// ─── GET ALL UNITS ────────────────────────────────────────────────────────────
const getUnits = async (req, res) => {
    try {
        const query = `
            SELECT u.*, s.society_name, s.society_code, s.type AS society_type,
                   b.name AS building_name, b.code AS building_code,
                   f.name AS floor_name
            FROM units u
            JOIN societies s ON u.society_id = s.id
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN floors f ON u.floor_id = f.id
            ORDER BY u.created_at DESC
        `;
        const [rows] = await db.execute(query);

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Get Units Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── GET UNIT BY ID ──────────────────────────────────────────────────────────
const getUnitById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT u.*, s.society_name, s.society_code, s.type AS society_type,
                   b.name AS building_name, b.code AS building_code,
                   f.name AS floor_name
            FROM units u
            JOIN societies s ON u.society_id = s.id
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN floors f ON u.floor_id = f.id
            WHERE u.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Unit not found" });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error("Get Unit By Id Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── CREATE UNIT ──────────────────────────────────────────────────────────────
const addUnit = async (req, res) => {
    try {
        const {
            society_id,
            building_id,
            floor_id,
            unit_category,
            unit_number,
            type,
            area,
            occupancy,
            status,
            owner_name,
            owner_number,
            owner_number_verified
        } = req.body;

        if (!society_id || !unit_number || !type) {
            return res.status(400).json({
                success: false,
                message: "Society, Unit Number, and Accommodation Type are required"
            });
        }

        // Check if society exists
        const [socRows] = await db.execute(`SELECT type FROM societies WHERE id = ?`, [society_id]);
        if (socRows.length === 0) {
            return res.status(404).json({ success: false, message: "Selected Society does not exist" });
        }
        const societyType = socRows[0].type;

        // Resolve unit category
        let resolvedCategory = unit_category;
        if (!resolvedCategory) {
            if (societyType === 'flat') resolvedCategory = 'flat';
            else if (societyType === 'bungalow') resolvedCategory = 'bungalow';
            else {
                resolvedCategory = building_id ? 'flat' : 'bungalow';
            }
        }

        // Validate unit category against society configuration
        if (societyType === 'flat' && resolvedCategory === 'bungalow') {
            return res.status(400).json({ success: false, message: "Cannot add a bungalow unit to a flat-only society" });
        }
        if (societyType === 'bungalow' && resolvedCategory === 'flat') {
            return res.status(400).json({ success: false, message: "Cannot add a flat unit to a bungalow-only society" });
        }

        // Resolve and validate building & floor IDs
        let resolvedBuildingId = null;
        let resolvedFloorId = null;

        if (resolvedCategory === 'flat') {
            if (!building_id || !floor_id) {
                return res.status(400).json({
                    success: false,
                    message: "Building and Floor are required for flat category units"
                });
            }
            resolvedBuildingId = building_id;
            resolvedFloorId = floor_id;
        }

        // Check duplicate unit code within same structure
        const duplicateCheckQuery = `
            SELECT id FROM units 
            WHERE society_id = ? 
              AND (building_id = ? OR (building_id IS NULL AND ? IS NULL)) 
              AND (floor_id = ? OR (floor_id IS NULL AND ? IS NULL)) 
              AND unit_number = ?
        `;
        const [duplicates] = await db.execute(duplicateCheckQuery, [
            society_id,
            resolvedBuildingId, resolvedBuildingId,
            resolvedFloorId, resolvedFloorId,
            unit_number
        ]);

        if (duplicates.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Unit Number '${unit_number}' already exists in this society structure`
            });
        }

        // Insert unit
        const insertQuery = `
            INSERT INTO units (
                society_id, building_id, floor_id, unit_category, unit_number, type, area, occupancy, status, owner_name, owner_number, owner_number_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(insertQuery, [
            society_id,
            resolvedBuildingId,
            resolvedFloorId,
            resolvedCategory,
            unit_number,
            type,
            area || null,
            occupancy || 'Vacant',
            status || 'active',
            status === 'active' ? (owner_name || null) : null,
            status === 'active' ? (owner_number || null) : null,
            status === 'active' ? (owner_number_verified ? 1 : 0) : 0
        ]);

        const unitId = result.insertId;

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Unit Module',
            'created',
            null,
            { id: unitId, unit_number, society_id, type, owner_name, owner_number, owner_number_verified }
        );

        return res.status(201).json({
            success: true,
            message: "Unit added successfully",
            data: { id: unitId }
        });
    } catch (error) {
        console.error("Create Unit Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── UPDATE UNIT ──────────────────────────────────────────────────────────────
const updateUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            society_id,
            building_id,
            floor_id,
            unit_category,
            unit_number,
            type,
            area,
            occupancy,
            status,
            owner_name,
            owner_number,
            owner_number_verified
        } = req.body;

        if (!society_id || !unit_number || !type) {
            return res.status(400).json({
                success: false,
                message: "Society, Unit Number, and Accommodation Type are required"
            });
        }

        // Check if unit exists
        const [existing] = await db.execute(`SELECT * FROM units WHERE id = ?`, [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Unit not found" });
        }
        const existingUnit = existing[0];

        // Check if society exists
        const [socRows] = await db.execute(`SELECT type FROM societies WHERE id = ?`, [society_id]);
        if (socRows.length === 0) {
            return res.status(404).json({ success: false, message: "Selected Society does not exist" });
        }
        const societyType = socRows[0].type;

        // Resolve unit category
        let resolvedCategory = unit_category;
        if (!resolvedCategory) {
            if (societyType === 'flat') resolvedCategory = 'flat';
            else if (societyType === 'bungalow') resolvedCategory = 'bungalow';
            else {
                resolvedCategory = building_id ? 'flat' : 'bungalow';
            }
        }

        // Validate unit category against society configuration
        if (societyType === 'flat' && resolvedCategory === 'bungalow') {
            return res.status(400).json({ success: false, message: "Cannot add a bungalow unit to a flat-only society" });
        }
        if (societyType === 'bungalow' && resolvedCategory === 'flat') {
            return res.status(400).json({ success: false, message: "Cannot add a flat unit to a bungalow-only society" });
        }

        // Resolve and validate building & floor IDs
        let resolvedBuildingId = null;
        let resolvedFloorId = null;

        if (resolvedCategory === 'flat') {
            if (!building_id || !floor_id) {
                return res.status(400).json({
                    success: false,
                    message: "Building and Floor are required for flat category units"
                });
            }
            resolvedBuildingId = building_id;
            resolvedFloorId = floor_id;
        }

        // Check duplicate (excluding current unit id)
        const duplicateCheckQuery = `
            SELECT id FROM units 
            WHERE society_id = ? 
              AND (building_id = ? OR (building_id IS NULL AND ? IS NULL)) 
              AND (floor_id = ? OR (floor_id IS NULL AND ? IS NULL)) 
              AND unit_number = ?
              AND id != ?
        `;
        const [duplicates] = await db.execute(duplicateCheckQuery, [
            society_id,
            resolvedBuildingId, resolvedBuildingId,
            resolvedFloorId, resolvedFloorId,
            unit_number,
            id
        ]);

        if (duplicates.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Unit Number '${unit_number}' already exists in this society structure`
            });
        }

        // Update
        const updateQuery = `
            UPDATE units SET
                society_id = ?, building_id = ?, floor_id = ?, unit_category = ?, unit_number = ?, type = ?, area = ?, occupancy = ?, status = ?, owner_name = ?, owner_number = ?, owner_number_verified = ?
            WHERE id = ?
        `;
        await db.execute(updateQuery, [
            society_id,
            resolvedBuildingId,
            resolvedFloorId,
            resolvedCategory,
            unit_number,
            type,
            area || null,
            occupancy || 'Vacant',
            status || 'active',
            status === 'active' ? (owner_name || null) : null,
            status === 'active' ? (owner_number || null) : null,
            status === 'active' ? (owner_number_verified ? 1 : 0) : 0,
            id
        ]);

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Unit Module',
            'updated',
            { id, unit_number: existingUnit.unit_number, society_id: existingUnit.society_id, owner_name: existingUnit.owner_name, owner_number: existingUnit.owner_number, owner_number_verified: existingUnit.owner_number_verified },
            { id, unit_number, society_id, type, owner_name, owner_number, owner_number_verified }
        );

        return res.status(200).json({
            success: true,
            message: "Unit updated successfully"
        });
    } catch (error) {
        console.error("Update Unit Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── DELETE UNIT ──────────────────────────────────────────────────────────────
const deleteUnit = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.execute(`SELECT unit_number, society_id FROM units WHERE id = ?`, [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Unit not found" });
        }
        const unit = existing[0];

        await db.execute(`DELETE FROM units WHERE id = ?`, [id]);

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Unit Module',
            'deleted',
            { id, unit_number: unit.unit_number, society_id: unit.society_id },
            null
        );

        return res.status(200).json({
            success: true,
            message: "Unit deleted successfully"
        });
    } catch (error) {
        console.error("Delete Unit Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── SEND OTP ────────────────────────────────────────────────────────────────
const sendOtp = async (req, res) => {
    try {
        const { owner_number } = req.body;
        if (!owner_number) {
            return res.status(400).json({ success: false, message: "Owner mobile number is required" });
        }

        const otp = generateOtp();
        const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes

        otpStore.set(owner_number, { otp, expiresAt });

        // Log OTP to server console (per user request)
        console.log(`\n===========================================`);
        console.log(`[OTP Verification] Owner Mobile: ${owner_number}`);
        console.log(`[OTP Verification] OTP Code: ${otp}`);
        console.log(`===========================================\n`);

        // Write OTP to a temporary file for testing purposes
        try {
            const fs = require("fs");
            const path = require("path");
            fs.writeFileSync(path.join(__dirname, "../temp_otp.txt"), otp);
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
        const { owner_number, otp } = req.body;
        if (!owner_number || !otp) {
            return res.status(400).json({ success: false, message: "Owner mobile number and OTP are required" });
        }

        const record = otpStore.get(owner_number);
        if (!record) {
            return res.status(400).json({ success: false, message: "OTP not sent or expired" });
        }

        if (Date.now() > record.expiresAt) {
            otpStore.delete(owner_number);
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        if (record.otp !== otp.toString()) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // Verification successful, remove OTP from store
        otpStore.delete(owner_number);

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
    getUnits,
    getUnitById,
    addUnit,
    updateUnit,
    deleteUnit,
    sendOtp,
    verifyOtp
};
