const fs = require("fs");
const path = require("path");
const db = require("../config/db.js");
const { uploadDir, getFileUrl } = require("../config/uploadConfig");
const { createAuditLog } = require("../models/auditLogModel.js");

// Helper to delete files from uploadDir
const deleteUploadFile = (filename) => {
    if (!filename) return;
    try {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        }
    } catch (err) {
        console.error(`Failed to delete file ${filename}:`, err.message);
    }
};

// Helper to calculate unit occupancy status based on residing status
const calculateOccupancyStatus = (hasOwner, ownerStatus, hasTenant, tenantStatus) => {
    const isOwnerResiding = hasOwner && ownerStatus === "active";
    const isTenantResiding = hasTenant && tenantStatus === "active";

    if (isOwnerResiding && isTenantResiding) {
        return "Self Occupied & Rented";
    } else if (isOwnerResiding) {
        return "Self Occupied";
    } else if (isTenantResiding) {
        return "Rented";
    } else {
        return "Vacant";
    }
};

// Helper to update unit occupancy status
const updateUnitOccupancy = async (conn, unitId, occupancy) => {
    await conn.execute("UPDATE units SET occupancy = ? WHERE id = ?", [occupancy, unitId]);
};

// ─── GET ALL RESIDENTS ──────────────────────────────────────────────────────────
const getResidents = async (req, res) => {
    try {
        const query = `
            SELECT r.*, u.unit_number, u.type AS unit_type,
                   s.society_name, s.society_code,
                   b.name AS building_name,
                   f.name AS floor_name
            FROM residents r
            JOIN units u ON r.unit_id = u.id
            JOIN societies s ON u.society_id = s.id
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN floors f ON u.floor_id = f.id
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.execute(query);

        const data = rows.map(r => ({
            ...r,
            owner_id_proof_url: r.owner_id_proof ? getFileUrl(r.owner_id_proof) : null,
            tenant_id_proof_url: r.tenant_id_proof ? getFileUrl(r.tenant_id_proof) : null,
            rent_agreement_url: r.rent_agreement ? getFileUrl(r.rent_agreement) : null
        }));

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get Residents Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── GET RESIDENT BY ID ────────────────────────────────────────────────────────
const getResidentById = async (req, res) => {
    try {
        const { id } = req.params;

        const residentQuery = `
            SELECT r.*, u.unit_number, u.type AS unit_type, u.society_id,
                   s.society_name,
                   b.name AS building_name,
                   f.name AS floor_name
            FROM residents r
            JOIN units u ON r.unit_id = u.id
            JOIN societies s ON u.society_id = s.id
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN floors f ON u.floor_id = f.id
            WHERE r.id = ?
        `;
        const [residentRows] = await db.execute(residentQuery, [id]);
        if (residentRows.length === 0) {
            return res.status(404).json({ success: false, message: "Resident not found" });
        }

        const resident = residentRows[0];
        resident.owner_id_proof_url = resident.owner_id_proof ? getFileUrl(resident.owner_id_proof) : null;
        resident.tenant_id_proof_url = resident.tenant_id_proof ? getFileUrl(resident.tenant_id_proof) : null;
        resident.rent_agreement_url = resident.rent_agreement ? getFileUrl(resident.rent_agreement) : null;

        // Fetch associated members
        const [membersRows] = await db.execute(
            "SELECT * FROM resident_members WHERE resident_id = ?",
            [id]
        );

        resident.members = membersRows.map(m => ({
            ...m,
            id_proof_url: m.id_proof ? getFileUrl(m.id_proof) : null
        }));

        return res.status(200).json({
            success: true,
            data: resident
        });
    } catch (error) {
        console.error("Get Resident By Id Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ─── ADD RESIDENT ──────────────────────────────────────────────────────────────
const addResident = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const {
            unit_id,
            has_owner: hasOwnerRaw,
            owner_name,
            owner_mobile,
            owner_email,
            owner_move_in_date,
            owner_emergency_contact,
            owner_status,
            has_tenant: hasTenantRaw,
            tenant_name,
            tenant_mobile,
            tenant_email,
            tenant_move_in_date,
            tenant_emergency_contact,
            tenant_status
        } = req.body;

        const has_owner = hasOwnerRaw === "true" || hasOwnerRaw === true ? 1 : 0;
        const has_tenant = hasTenantRaw === "true" || hasTenantRaw === true ? 1 : 0;

        if (!unit_id) {
            if (req.files) {
                req.files.forEach(f => deleteUploadFile(f.filename));
            }
            return res.status(400).json({ success: false, message: "Assigned Unit is required" });
        }

        if (!has_owner && !has_tenant) {
            if (req.files) {
                req.files.forEach(f => deleteUploadFile(f.filename));
            }
            return res.status(400).json({ success: false, message: "Please enable Owner details, Tenant details, or both" });
        }

        // Validate owner fields if owner resides
        if (has_owner) {
            if (!owner_name || !owner_mobile || !owner_email || !owner_move_in_date || !owner_emergency_contact) {
                if (req.files) {
                    req.files.forEach(f => deleteUploadFile(f.filename));
                }
                return res.status(400).json({
                    success: false,
                    message: "All owner details fields highlighted with * are required"
                });
            }
        }

        // Validate tenant fields if tenant resides
        if (has_tenant) {
            if (!tenant_name || !tenant_mobile || !tenant_email || !tenant_move_in_date || !tenant_emergency_contact) {
                if (req.files) {
                    req.files.forEach(f => deleteUploadFile(f.filename));
                }
                return res.status(400).json({
                    success: false,
                    message: "All tenant details fields highlighted with * are required"
                });
            }
        }

        // Check if a resident profile already exists for this unit
        const [existingProfile] = await conn.execute("SELECT id FROM residents WHERE unit_id = ?", [unit_id]);
        if (existingProfile.length > 0) {
            if (req.files) {
                req.files.forEach(f => deleteUploadFile(f.filename));
            }
            return res.status(400).json({
                success: false,
                message: "A Resident profile already exists for this unit. Please edit the existing profile."
            });
        }

        // Map files
        let owner_id_proof = null;
        let tenant_id_proof = null;
        let rent_agreement = null;

        if (req.files) {
            const ownerIdProofFile = req.files.find(f => f.fieldname === "owner_id_proof");
            if (ownerIdProofFile) owner_id_proof = ownerIdProofFile.filename;

            const tenantIdProofFile = req.files.find(f => f.fieldname === "tenant_id_proof");
            if (tenantIdProofFile) tenant_id_proof = tenantIdProofFile.filename;

            const rentAgreementFile = req.files.find(f => f.fieldname === "rent_agreement");
            if (rentAgreementFile) rent_agreement = rentAgreementFile.filename;
        }

        // Insert Resident Profile
        const insertResidentQuery = `
            INSERT INTO residents (
                unit_id,
                has_owner, owner_name, owner_mobile, owner_email, owner_move_in_date, owner_id_proof, owner_emergency_contact, owner_status,
                has_tenant, tenant_name, tenant_mobile, tenant_email, tenant_move_in_date, tenant_id_proof, tenant_emergency_contact, tenant_status, rent_agreement
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [residentResult] = await conn.execute(insertResidentQuery, [
            unit_id,
            has_owner,
            has_owner ? owner_name.trim() : null,
            has_owner ? owner_mobile.trim() : null,
            has_owner ? owner_email.trim() : null,
            has_owner ? owner_move_in_date : null,
            has_owner ? owner_id_proof : null,
            has_owner ? owner_emergency_contact.trim() : null,
            has_owner ? owner_status : "active",
            has_tenant,
            has_tenant ? tenant_name.trim() : null,
            has_tenant ? tenant_mobile.trim() : null,
            has_tenant ? tenant_email.trim() : null,
            has_tenant ? tenant_move_in_date : null,
            has_tenant ? tenant_id_proof : null,
            has_tenant ? tenant_emergency_contact.trim() : null,
            has_tenant ? tenant_status : "active",
            has_tenant ? rent_agreement : null
        ]);

        const residentId = residentResult.insertId;

        // Parse and Insert Members/Co-tenants
        let members = [];
        if (req.body.members) {
            try {
                members = JSON.parse(req.body.members);
            } catch (err) {
                console.error("Failed to parse members JSON:", err);
            }
        }

        if (Array.isArray(members) && members.length > 0) {
            for (let i = 0; i < members.length; i++) {
                const member = members[i];
                if (!member.name || !member.name.trim()) continue;

                // Only insert if the corresponding has_owner / has_tenant is enabled
                if (member.member_type === "Family Member" && !has_owner) continue;
                if (member.member_type === "Tenant" && !has_tenant) continue;

                // Find file for this member
                let memberIdProof = null;
                if (req.files) {
                    const memberFile = req.files.find(f => f.fieldname === `member_id_proof_${i}`);
                    if (memberFile) memberIdProof = memberFile.filename;
                }

                const insertMemberQuery = `
                    INSERT INTO resident_members (
                        resident_id, name, mobile_number, email, id_proof, emergency_contact, member_type, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                await conn.execute(insertMemberQuery, [
                    residentId,
                    member.name.trim(),
                    member.mobile_number ? member.mobile_number.trim() : null,
                    member.email ? member.email.trim() : null,
                    memberIdProof,
                    member.emergency_contact ? member.emergency_contact.trim() : null,
                    member.member_type,
                    member.status || "active"
                ]);
            }
        }

        // Calculate and Update Unit Occupancy
        const occupancy = calculateOccupancyStatus(has_owner, owner_status, has_tenant, tenant_status);
        await updateUnitOccupancy(conn, unit_id, occupancy);

        // Create Audit Log
        const adminDeviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || "Unknown",
            adminDeviceId,
            "Resident Module",
            "created",
            null,
            { id: residentId, unit_id, has_owner, has_tenant }
        );

        await conn.commit();

        return res.status(201).json({
            success: true,
            message: "Resident profile registered successfully",
            data: { id: residentId }
        });
    } catch (error) {
        await conn.rollback();
        if (req.files) {
            req.files.forEach(f => deleteUploadFile(f.filename));
        }
        console.error("Create Resident Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        conn.release();
    }
};

// ─── UPDATE RESIDENT ───────────────────────────────────────────────────────────
const updateResident = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;

        // Check if resident exists
        const [existing] = await conn.execute("SELECT * FROM residents WHERE id = ?", [id]);
        if (existing.length === 0) {
            if (req.files) {
                req.files.forEach(f => deleteUploadFile(f.filename));
            }
            return res.status(404).json({ success: false, message: "Resident not found" });
        }
        const existingResident = existing[0];

        const {
            unit_id,
            has_owner: hasOwnerRaw,
            owner_name,
            owner_mobile,
            owner_email,
            owner_move_in_date,
            owner_emergency_contact,
            owner_status,
            has_tenant: hasTenantRaw,
            tenant_name,
            tenant_mobile,
            tenant_email,
            tenant_move_in_date,
            tenant_emergency_contact,
            tenant_status
        } = req.body;

        const has_owner = hasOwnerRaw === "true" || hasOwnerRaw === true ? 1 : 0;
        const has_tenant = hasTenantRaw === "true" || hasTenantRaw === true ? 1 : 0;

        if (!unit_id) {
            if (req.files) {
                req.files.forEach(f => deleteUploadFile(f.filename));
            }
            return res.status(400).json({ success: false, message: "Assigned Unit is required" });
        }

        if (!has_owner && !has_tenant) {
            if (req.files) {
                req.files.forEach(f => deleteUploadFile(f.filename));
            }
            return res.status(400).json({ success: false, message: "Please enable Owner details, Tenant details, or both" });
        }

        // Validate owner fields if owner resides
        if (has_owner) {
            if (!owner_name || !owner_mobile || !owner_email || !owner_move_in_date || !owner_emergency_contact) {
                if (req.files) {
                    req.files.forEach(f => deleteUploadFile(f.filename));
                }
                return res.status(400).json({
                    success: false,
                    message: "All owner details fields highlighted with * are required"
                });
            }
        }

        // Validate tenant fields if tenant resides
        if (has_tenant) {
            if (!tenant_name || !tenant_mobile || !tenant_email || !tenant_move_in_date || !tenant_emergency_contact) {
                if (req.files) {
                    req.files.forEach(f => deleteUploadFile(f.filename));
                }
                return res.status(400).json({
                    success: false,
                    message: "All tenant details fields highlighted with * are required"
                });
            }
        }

        // Check if unique constraint is violated on unit change
        if (Number(existingResident.unit_id) !== Number(unit_id)) {
            const [existingProfile] = await conn.execute("SELECT id FROM residents WHERE unit_id = ?", [unit_id]);
            if (existingProfile.length > 0) {
                if (req.files) {
                    req.files.forEach(f => deleteUploadFile(f.filename));
                }
                return res.status(400).json({
                    success: false,
                    message: "A Resident profile already exists for the selected unit."
                });
            }
        }

        // Handle Owner ID Proof replacement/removal
        let owner_id_proof = existingResident.owner_id_proof;
        const removeOwnerIdProof = req.body.remove_owner_id_proof === "true" || !has_owner;
        if (removeOwnerIdProof && existingResident.owner_id_proof) {
            deleteUploadFile(existingResident.owner_id_proof);
            owner_id_proof = null;
        }

        // Handle Tenant ID Proof replacement/removal
        let tenant_id_proof = existingResident.tenant_id_proof;
        const removeTenantIdProof = req.body.remove_tenant_id_proof === "true" || !has_tenant;
        if (removeTenantIdProof && existingResident.tenant_id_proof) {
            deleteUploadFile(existingResident.tenant_id_proof);
            tenant_id_proof = null;
        }

        // Handle Rent Agreement replacement/removal
        let rent_agreement = existingResident.rent_agreement;
        const removeRentAgreement = req.body.remove_rent_agreement === "true" || !has_tenant;
        if (removeRentAgreement && existingResident.rent_agreement) {
            deleteUploadFile(existingResident.rent_agreement);
            rent_agreement = null;
        }

        // Map newly uploaded files
        if (req.files) {
            const ownerIdProofFile = req.files.find(f => f.fieldname === "owner_id_proof");
            if (ownerIdProofFile && has_owner) {
                if (existingResident.owner_id_proof) deleteUploadFile(existingResident.owner_id_proof);
                owner_id_proof = ownerIdProofFile.filename;
            }

            const tenantIdProofFile = req.files.find(f => f.fieldname === "tenant_id_proof");
            if (tenantIdProofFile && has_tenant) {
                if (existingResident.tenant_id_proof) deleteUploadFile(existingResident.tenant_id_proof);
                tenant_id_proof = tenantIdProofFile.filename;
            }

            const rentAgreementFile = req.files.find(f => f.fieldname === "rent_agreement");
            if (rentAgreementFile && has_tenant) {
                if (existingResident.rent_agreement) deleteUploadFile(existingResident.rent_agreement);
                rent_agreement = rentAgreementFile.filename;
            }
        }

        // Update main resident profile
        const updateResidentQuery = `
            UPDATE residents SET
                unit_id = ?,
                has_owner = ?,
                owner_name = ?,
                owner_mobile = ?,
                owner_email = ?,
                owner_move_in_date = ?,
                owner_id_proof = ?,
                owner_emergency_contact = ?,
                owner_status = ?,
                has_tenant = ?,
                tenant_name = ?,
                tenant_mobile = ?,
                tenant_email = ?,
                tenant_move_in_date = ?,
                tenant_id_proof = ?,
                tenant_emergency_contact = ?,
                tenant_status = ?,
                rent_agreement = ?
            WHERE id = ?
        `;
        await conn.execute(updateResidentQuery, [
            unit_id,
            has_owner,
            has_owner ? owner_name.trim() : null,
            has_owner ? owner_mobile.trim() : null,
            has_owner ? owner_email.trim() : null,
            has_owner ? owner_move_in_date : null,
            owner_id_proof,
            has_owner ? owner_emergency_contact.trim() : null,
            has_owner ? owner_status : "active",
            has_tenant,
            has_tenant ? tenant_name.trim() : null,
            has_tenant ? tenant_mobile.trim() : null,
            has_tenant ? tenant_email.trim() : null,
            has_tenant ? tenant_move_in_date : null,
            tenant_id_proof,
            has_tenant ? tenant_emergency_contact.trim() : null,
            has_tenant ? tenant_status : "active",
            rent_agreement,
            id
        ]);

        // Parse members payload
        let members = [];
        if (req.body.members) {
            try {
                members = JSON.parse(req.body.members);
            } catch (err) {
                console.error("Failed to parse members JSON:", err);
            }
        }

        // Fetch existing members in DB
        const [existingMembers] = await conn.execute(
            "SELECT id, id_proof, member_type FROM resident_members WHERE resident_id = ?",
            [id]
        );

        // Map existing members for convenience
        const existingMembersMap = {};
        existingMembers.forEach(m => {
            existingMembersMap[m.id] = m;
        });

        // Track members kept
        const keptMemberIds = [];

        if (Array.isArray(members)) {
            for (let i = 0; i < members.length; i++) {
                const member = members[i];
                if (!member.name || !member.name.trim()) continue;

                // Skip child rows if the parent entity was disabled
                if (member.member_type === "Family Member" && !has_owner) continue;
                if (member.member_type === "Tenant" && !has_tenant) continue;

                // Handle file upload check
                let memberIdProof = member.id_proof || null;
                const fileFieldName = `member_id_proof_${i}`;

                if (req.files) {
                    const uploadedMemberFile = req.files.find(f => f.fieldname === fileFieldName);
                    if (uploadedMemberFile) {
                        // Delete old file if present
                        if (member.id) {
                            const oldMemberObj = existingMembersMap[member.id];
                            if (oldMemberObj && oldMemberObj.id_proof) {
                                deleteUploadFile(oldMemberObj.id_proof);
                            }
                        }
                        memberIdProof = uploadedMemberFile.filename;
                    }
                }

                // If explicit deletion of ID proof requested
                if (member.remove_id_proof === true || member.remove_id_proof === "true") {
                    if (member.id) {
                        const oldMemberObj = existingMembersMap[member.id];
                        if (oldMemberObj && oldMemberObj.id_proof) {
                            deleteUploadFile(oldMemberObj.id_proof);
                        }
                    }
                    memberIdProof = null;
                }

                if (member.id) {
                    // Update existing member
                    keptMemberIds.push(member.id);
                    const updateMemberQuery = `
                        UPDATE resident_members SET
                            name = ?, mobile_number = ?, email = ?, id_proof = ?, emergency_contact = ?, member_type = ?, status = ?
                        WHERE id = ? AND resident_id = ?
                    `;
                    await conn.execute(updateMemberQuery, [
                        member.name.trim(),
                        member.mobile_number ? member.mobile_number.trim() : null,
                        member.email ? member.email.trim() : null,
                        memberIdProof,
                        member.emergency_contact ? member.emergency_contact.trim() : null,
                        member.member_type,
                        member.status || "active",
                        member.id,
                        id
                    ]);
                } else {
                    // Insert new member
                    const insertMemberQuery = `
                        INSERT INTO resident_members (
                            resident_id, name, mobile_number, email, id_proof, emergency_contact, member_type, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    const [insertResult] = await conn.execute(insertMemberQuery, [
                        id,
                        member.name.trim(),
                        member.mobile_number ? member.mobile_number.trim() : null,
                        member.email ? member.email.trim() : null,
                        memberIdProof,
                        member.emergency_contact ? member.emergency_contact.trim() : null,
                        member.member_type,
                        member.status || "active"
                    ]);
                    keptMemberIds.push(insertResult.insertId);
                }
            }
        }

        // Delete members not kept, OR members belonging to sections that have been turned off
        for (const existingM of existingMembers) {
            const belongsToDisabledSection = 
                (existingM.member_type === "Family Member" && !has_owner) ||
                (existingM.member_type === "Tenant" && !has_tenant);

            if (!keptMemberIds.includes(existingM.id) || belongsToDisabledSection) {
                if (existingM.id_proof) {
                    deleteUploadFile(existingM.id_proof);
                }
                await conn.execute("DELETE FROM resident_members WHERE id = ?", [existingM.id]);
            }
        }

        // Revert occupancy on the old unit if unit was changed
        if (Number(existingResident.unit_id) !== Number(unit_id)) {
            await updateUnitOccupancy(conn, existingResident.unit_id, "Vacant");
        }

        // Calculate and Update occupancy for the new/current unit
        const newOccupancy = calculateOccupancyStatus(has_owner, owner_status, has_tenant, tenant_status);
        await updateUnitOccupancy(conn, unit_id, newOccupancy);

        // Create Audit Log
        const adminDeviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || "Unknown",
            adminDeviceId,
            "Resident Module",
            "updated",
            { id, unit_id: existingResident.unit_id, has_owner: existingResident.has_owner, has_tenant: existingResident.has_tenant },
            { id, unit_id, has_owner, has_tenant }
        );

        await conn.commit();

        return res.status(200).json({
            success: true,
            message: "Resident profile updated successfully"
        });
    } catch (error) {
        await conn.rollback();
        if (req.files) {
            req.files.forEach(f => deleteUploadFile(f.filename));
        }
        console.error("Update Resident Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        conn.release();
    }
};

// ─── DELETE RESIDENT ───────────────────────────────────────────────────────────
const deleteResident = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;

        // Fetch resident info to delete files and update occupancy
        const [existing] = await conn.execute("SELECT * FROM residents WHERE id = ?", [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Resident not found" });
        }
        const resident = existing[0];

        // Fetch all member files to delete from disk
        const [members] = await conn.execute("SELECT id_proof FROM resident_members WHERE resident_id = ?", [id]);

        // Delete primary files
        deleteUploadFile(resident.owner_id_proof);
        deleteUploadFile(resident.tenant_id_proof);
        deleteUploadFile(resident.rent_agreement);

        // Delete member files
        members.forEach(m => {
            if (m.id_proof) deleteUploadFile(m.id_proof);
        });

        // Delete main resident (cascades to members)
        await conn.execute("DELETE FROM residents WHERE id = ?", [id]);

        // Revert unit status to vacant
        await updateUnitOccupancy(conn, resident.unit_id, "Vacant");

        // Create Audit Log
        const adminDeviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || "Unknown",
            adminDeviceId,
            "Resident Module",
            "deleted",
            { id, unit_id: resident.unit_id, has_owner: resident.has_owner, has_tenant: resident.has_tenant },
            null
        );

        await conn.commit();

        return res.status(200).json({
            success: true,
            message: "Resident profile deleted successfully"
        });
    } catch (error) {
        await conn.rollback();
        console.error("Delete Resident Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        conn.release();
    }
};

module.exports = {
    getResidents,
    getResidentById,
    addResident,
    updateResident,
    deleteResident
};
