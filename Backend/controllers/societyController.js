const fs = require("fs");
const path = require("path");
const db = require("../config/db.js");
const { uploadDir, getFileUrl } = require("../config/uploadConfig");
const { createAuditLog } = require("../models/auditLogModel.js");

// Helper to delete an image file from the disk
const deleteImageFile = (filename) => {
    if (!filename) return;
    try {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old image: ${filePath}`);
        }
    } catch (err) {
        console.error(`Failed to delete image ${filename}:`, err.message);
    }
};

// ─── GET ALL SOCIETIES ────────────────────────────────────────────────────────
const getSocieties = async (req, res) => {
    try {
        const query = `
            SELECT s.*, 
                (SELECT COUNT(*) FROM buildings b WHERE b.society_id = s.id) AS building_count,
                (SELECT COUNT(*) FROM floors f JOIN buildings b ON f.building_id = b.id WHERE b.society_id = s.id) AS floor_count
            FROM societies s
            ORDER BY s.created_at DESC
        `;
        const [rows] = await db.execute(query);

        const societies = rows.map(s => ({
            ...s,
            society_image_url: s.society_image ? getFileUrl(s.society_image) : null
        }));

        return res.status(200).json({
            success: true,
            data: societies
        });
    } catch (error) {
        console.error("Get Societies Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── GET SOCIETY BY ID ────────────────────────────────────────────────────────
const getSocietyById = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch basic details
        const [socRows] = await db.execute(`SELECT * FROM societies WHERE id = ?`, [id]);
        if (socRows.length === 0) {
            return res.status(404).json({ success: false, message: "Society not found" });
        }

        const society = socRows[0];
        society.society_image_url = society.society_image ? getFileUrl(society.society_image) : null;

        // Fetch buildings
        const [buildings] = await db.execute(`SELECT * FROM buildings WHERE society_id = ?`, [id]);

        // Fetch floors for this society's buildings
        let floors = [];
        if (buildings.length > 0) {
            const buildingIds = buildings.map(b => b.id);
            const [floorRows] = await db.query(
                `SELECT * FROM floors WHERE building_id IN (${buildingIds.join(",")})`
            );
            floors = floorRows;
        }

        return res.status(200).json({
            success: true,
            data: {
                ...society,
                buildings,
                floors
            }
        });
    } catch (error) {
        console.error("Get Society By Id Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── CREATE SOCIETY ──────────────────────────────────────────────────────────
const addSociety = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            society_name,
            society_code,
            registration_number,
            society_status,
            street_address,
            city,
            state,
            pincode,
            office_contact,
            admin_email,
            security_emergency_contact,
            type
        } = req.body;

        // Parse nested buildings and floors
        let buildings = [];
        let floors = [];
        try {
            buildings = req.body.buildings ? JSON.parse(req.body.buildings) : [];
            floors = req.body.floors ? JSON.parse(req.body.floors) : [];
        } catch (e) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Invalid buildings or floors JSON structure" });
        }

        if (!society_name || !society_code) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Society Name and Code are required" });
        }

        // Check if code is unique
        const [existingCode] = await connection.execute(
            `SELECT id FROM societies WHERE society_code = ?`,
            [society_code]
        );
        if (existingCode.length > 0) {
            await connection.rollback();
            if (req.file) deleteImageFile(req.file.filename);
            return res.status(400).json({ success: false, message: "Society Code already exists" });
        }

        // Set image filename if uploaded
        const society_image = req.file ? req.file.filename : null;

        // Insert Society
        const insertSocietyQuery = `
            INSERT INTO societies (
                society_image, society_name, society_code, registration_number, society_status,
                street_address, city, state, pincode, office_contact, admin_email,
                security_emergency_contact, type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [socResult] = await connection.execute(insertSocietyQuery, [
            society_image,
            society_name,
            society_code,
            registration_number || null,
            society_status || 'active',
            street_address || null,
            city || null,
            state || null,
            pincode || null,
            office_contact || null,
            admin_email || null,
            security_emergency_contact || null,
            type || 'both'
        ]);

        const societyId = socResult.insertId;

        // Map frontend tempIds to generated DB IDs
        const bldgTempMap = {};

        // Only insert buildings & floors if type is 'flat' or 'both'
        if (type === 'flat' || type === 'both') {
            // Insert buildings
            for (const b of buildings) {
                const [bResult] = await connection.execute(
                    `INSERT INTO buildings (society_id, name, code, total_floors, status) VALUES (?, ?, ?, ?, ?)`,
                    [societyId, b.name, b.code, b.total_floors || 1, b.status || 'active']
                );
                const newBldgId = bResult.insertId;
                if (b.tempId) {
                    bldgTempMap[b.tempId] = newBldgId;
                }
            }

            // Insert floors
            for (const f of floors) {
                let resolvedBldgId = f.buildingId;
                if (!resolvedBldgId && f.buildingTempId) {
                    resolvedBldgId = bldgTempMap[f.buildingTempId];
                }

                if (!resolvedBldgId) {
                    console.warn(`Skipping floor ${f.name} because building could not be resolved`);
                    continue;
                }

                await connection.execute(
                    `INSERT INTO floors (building_id, name, num_flats, status) VALUES (?, ?, ?, ?)`,
                    [resolvedBldgId, f.name, f.num_flats || 0, f.status || 'active']
                );
            }
        }

        await connection.commit();

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Society Master',
            'created',
            null,
            { id: societyId, name: society_name, code: society_code }
        );

        return res.status(201).json({ success: true, message: "Society created successfully", data: { id: societyId } });
    } catch (error) {
        await connection.rollback();
        if (req.file) deleteImageFile(req.file.filename);
        console.error("Create Society Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        connection.release();
    }
};

// ─── UPDATE SOCIETY ──────────────────────────────────────────────────────────
const updateSociety = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if society exists
        const [socRows] = await connection.execute(`SELECT * FROM societies WHERE id = ?`, [id]);
        if (socRows.length === 0) {
            await connection.rollback();
            if (req.file) deleteImageFile(req.file.filename);
            return res.status(404).json({ success: false, message: "Society not found" });
        }
        const existingSoc = socRows[0];

        const {
            society_name,
            society_code,
            registration_number,
            society_status,
            street_address,
            city,
            state,
            pincode,
            office_contact,
            admin_email,
            security_emergency_contact,
            type,
            removeImage
        } = req.body;

        // Parse nested buildings and floors
        let buildings = [];
        let floors = [];
        try {
            buildings = req.body.buildings ? JSON.parse(req.body.buildings) : [];
            floors = req.body.floors ? JSON.parse(req.body.floors) : [];
        } catch (e) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Invalid buildings or floors JSON structure" });
        }

        if (!society_name || !society_code) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Society Name and Code are required" });
        }

        // Check if society_code is unique (excluding this society)
        const [existingCode] = await connection.execute(
            `SELECT id FROM societies WHERE society_code = ? AND id != ?`,
            [society_code, id]
        );
        if (existingCode.length > 0) {
            await connection.rollback();
            if (req.file) deleteImageFile(req.file.filename);
            return res.status(400).json({ success: false, message: "Society Code already exists" });
        }

        // Handle Image Update
        let society_image = existingSoc.society_image;
        if (req.file) {
            // New image uploaded, delete old one
            deleteImageFile(existingSoc.society_image);
            society_image = req.file.filename;
        } else if (removeImage === 'true') {
            // Image explicitly removed
            deleteImageFile(existingSoc.society_image);
            society_image = null;
        }

        // Update basic society details
        const updateSocQuery = `
            UPDATE societies SET
                society_image = ?, society_name = ?, society_code = ?, registration_number = ?,
                society_status = ?, street_address = ?, city = ?, state = ?, pincode = ?,
                office_contact = ?, admin_email = ?, security_emergency_contact = ?, type = ?
            WHERE id = ?
        `;
        await connection.execute(updateSocQuery, [
            society_image,
            society_name,
            society_code,
            registration_number || null,
            society_status || 'active',
            street_address || null,
            city || null,
            state || null,
            pincode || null,
            office_contact || null,
            admin_email || null,
            security_emergency_contact || null,
            type || 'both',
            id
        ]);

        // Sync buildings and floors if type is 'flat' or 'both'
        if (type === 'flat' || type === 'both') {
            // Fetch DB buildings currently present
            const [dbBldgs] = await connection.execute(`SELECT id FROM buildings WHERE society_id = ?`, [id]);
            const dbBldgIds = dbBldgs.map(b => b.id);

            // Determine incoming building IDs
            const incomingBldgIds = buildings.map(b => b.id).filter(Boolean);

            // Delete buildings not present in incoming list
            const bldgsToDelete = dbBldgIds.filter(bid => !incomingBldgIds.includes(bid));
            if (bldgsToDelete.length > 0) {
                await connection.query(`DELETE FROM buildings WHERE id IN (${bldgsToDelete.join(",")})`);
            }

            // Map tempIds to DB IDs for new buildings
            const bldgTempMap = {};

            // Save/Update buildings
            for (const b of buildings) {
                if (b.id) {
                    // Update existing building
                    await connection.execute(
                        `UPDATE buildings SET name = ?, code = ?, total_floors = ?, status = ? WHERE id = ? AND society_id = ?`,
                        [b.name, b.code, b.total_floors || 1, b.status || 'active', b.id, id]
                    );
                } else {
                    // Insert new building
                    const [bResult] = await connection.execute(
                        `INSERT INTO buildings (society_id, name, code, total_floors, status) VALUES (?, ?, ?, ?, ?)`,
                        [id, b.name, b.code, b.total_floors || 1, b.status || 'active']
                    );
                    const newBldgId = bResult.insertId;
                    if (b.tempId) {
                        bldgTempMap[b.tempId] = newBldgId;
                    }
                }
            }

            // Sync floors
            // Get all remaining building IDs for the society (after deletions and additions)
            const [currentBldgs] = await connection.execute(`SELECT id FROM buildings WHERE society_id = ?`, [id]);
            const currentBldgIds = currentBldgs.map(b => b.id);

            // Resolve building_id and insert/update floors
            const incomingFloorIds = [];
            for (const f of floors) {
                let resolvedBldgId = f.buildingId;
                if (!resolvedBldgId && f.buildingTempId) {
                    resolvedBldgId = bldgTempMap[f.buildingTempId];
                }

                if (!resolvedBldgId) {
                    // It might be a DB building ID already available in the floor
                    resolvedBldgId = f.building_id;
                }

                if (!resolvedBldgId || !currentBldgIds.includes(resolvedBldgId)) {
                    console.warn(`Skipping floor sync for ${f.name} (invalid building reference)`);
                    continue;
                }

                if (f.id) {
                    // Update existing floor
                    await connection.execute(
                        `UPDATE floors SET name = ?, num_flats = ?, status = ? WHERE id = ? AND building_id = ?`,
                        [f.name, f.num_flats || 0, f.status || 'active', f.id, resolvedBldgId]
                    );
                    incomingFloorIds.push(f.id);
                } else {
                    // Insert new floor
                    const [fResult] = await connection.execute(
                        `INSERT INTO floors (building_id, name, num_flats, status) VALUES (?, ?, ?, ?)`,
                        [resolvedBldgId, f.name, f.num_flats || 0, f.status || 'active']
                    );
                    incomingFloorIds.push(fResult.insertId);
                }
            }

            // Delete old floors not in incoming floors list (only from current buildings of this society)
            if (currentBldgIds.length > 0) {
                const [dbFloors] = await connection.query(
                    `SELECT id FROM floors WHERE building_id IN (${currentBldgIds.join(",")})`
                );
                const dbFloorIds = dbFloors.map(f => f.id);
                const floorsToDelete = dbFloorIds.filter(fid => !incomingFloorIds.includes(fid));
                if (floorsToDelete.length > 0) {
                    await connection.query(`DELETE FROM floors WHERE id IN (${floorsToDelete.join(",")})`);
                }
            }
        } else {
            // If type is 'bungalow', delete all buildings/floors associated with the society
            await connection.execute(`DELETE FROM buildings WHERE society_id = ?`, [id]);
        }

        await connection.commit();

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Society Master',
            'updated',
            { id: id, name: existingSoc.society_name, code: existingSoc.society_code },
            { id: id, name: society_name, code: society_code }
        );

        return res.status(200).json({ success: true, message: "Society updated successfully" });
    } catch (error) {
        await connection.rollback();
        if (req.file) deleteImageFile(req.file.filename);
        console.error("Update Society Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        connection.release();
    }
};

// ─── DELETE SOCIETY ──────────────────────────────────────────────────────────
const deleteSociety = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get society image filename before delete
        const [socRows] = await connection.execute(`SELECT society_name, society_code, society_image FROM societies WHERE id = ?`, [id]);
        if (socRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Society not found" });
        }
        const society = socRows[0];

        // Delete from database (cascade deletes buildings and floors)
        await connection.execute(`DELETE FROM societies WHERE id = ?`, [id]);

        // Delete image file from disk
        if (society.society_image) {
            deleteImageFile(society.society_image);
        }

        await connection.commit();

        // Create Audit Log
        const adminDeviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            adminDeviceId,
            'Society Master',
            'deleted',
            { id: id, name: society.society_name, code: society.society_code },
            null
        );

        return res.status(200).json({ success: true, message: "Society deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Delete Society Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        connection.release();
    }
};

module.exports = {
    getSocieties,
    getSocietyById,
    addSociety,
    updateSociety,
    deleteSociety
};
