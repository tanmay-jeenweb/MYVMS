import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import DataTable from "../../components/DataTable";
import { usePermission } from "../../context/PermissionContext";
import {
    getResidents,
    getResidentById,
    createResident,
    updateResident,
    deleteResident
} from "../../api/residentApi";
import { getUnits } from "../../api/unitApi";

export default function ResidentModule() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canRead = hasPermission("resident_module", "read");
    const canWrite = hasPermission("resident_module", "write");
    const canUpdate = hasPermission("resident_module", "update");
    const canDelete = hasPermission("resident_module", "delete");

    const [residents, setResidents] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formMode, setFormMode] = useState("list"); // "list", "create", "edit"
    const [selectedId, setSelectedId] = useState(null);

    // --- Form States ---
    const [unitId, setUnitId] = useState("");
    const [hasOwner, setHasOwner] = useState(true);
    const [hasTenant, setHasTenant] = useState(false);

    // Owner Fields
    const [ownerName, setOwnerName] = useState("");
    const [ownerMobile, setOwnerMobile] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [ownerMoveInDate, setOwnerMoveInDate] = useState("");
    const [ownerEmergencyContact, setOwnerEmergencyContact] = useState("");
    const [ownerStatus, setOwnerStatus] = useState("active");

    const [ownerIdProofFile, setOwnerIdProofFile] = useState(null);
    const [ownerIdProofPreviewName, setOwnerIdProofPreviewName] = useState("");
    const [existingOwnerIdProofUrl, setExistingOwnerIdProofUrl] = useState(null);
    const [removeOwnerIdProof, setRemoveOwnerIdProof] = useState(false);

    // Tenant Fields
    const [tenantName, setTenantName] = useState("");
    const [tenantMobile, setTenantMobile] = useState("");
    const [tenantEmail, setTenantEmail] = useState("");
    const [tenantMoveInDate, setTenantMoveInDate] = useState("");
    const [tenantEmergencyContact, setTenantEmergencyContact] = useState("");
    const [tenantStatus, setTenantStatus] = useState("active");

    const [tenantIdProofFile, setTenantIdProofFile] = useState(null);
    const [tenantIdProofPreviewName, setTenantIdProofPreviewName] = useState("");
    const [existingTenantIdProofUrl, setExistingTenantIdProofUrl] = useState(null);
    const [removeTenantIdProof, setRemoveTenantIdProof] = useState(false);

    const [rentAgreementFile, setRentAgreementFile] = useState(null);
    const [rentAgreementPreviewName, setRentAgreementPreviewName] = useState("");
    const [existingRentAgreementUrl, setExistingRentAgreementUrl] = useState(null);
    const [removeRentAgreement, setRemoveRentAgreement] = useState(false);

    // Dynamic Child Members (combined Family Members + Co-Tenants)
    const [members, setMembers] = useState([]);

    const [saving, setSaving] = useState(false);

    // --- Load Data on Mount ---
    useEffect(() => {
        if (canRead) {
            loadInitialData();
        }
    }, [canRead]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [residentsRes, unitsRes] = await Promise.all([
                getResidents(),
                getUnits().catch(() => ({ data: { success: true, data: [] } }))
            ]);

            if (residentsRes.data && residentsRes.data.success) {
                setResidents(residentsRes.data.data || []);
            }
            if (unitsRes.data && unitsRes.data.success) {
                const rawUnits = unitsRes.data.data || [];
                // Sort units for listing
                setUnits(rawUnits);
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
            toast.error("Failed to load records");
        } finally {
            setLoading(false);
        }
    };

    // --- Reset Form Fields ---
    const resetForm = () => {
        setUnitId("");
        setHasOwner(true);
        setHasTenant(false);

        setOwnerName("");
        setOwnerMobile("");
        setOwnerEmail("");
        setOwnerMoveInDate("");
        setOwnerEmergencyContact("");
        setOwnerStatus("active");
        setOwnerIdProofFile(null);
        setOwnerIdProofPreviewName("");
        setExistingOwnerIdProofUrl(null);
        setRemoveOwnerIdProof(false);

        setTenantName("");
        setTenantMobile("");
        setTenantEmail("");
        setTenantMoveInDate("");
        setTenantEmergencyContact("");
        setTenantStatus("active");
        setTenantIdProofFile(null);
        setTenantIdProofPreviewName("");
        setExistingTenantIdProofUrl(null);
        setRemoveTenantIdProof(false);

        setRentAgreementFile(null);
        setRentAgreementPreviewName("");
        setExistingRentAgreementUrl(null);
        setRemoveRentAgreement(false);

        setMembers([]);
        setSelectedId(null);
        setFormMode("list");
    };

    // --- File Input Handlers ---
    const handleFileChange = (e, fileType, idx = null) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size should not exceed 10MB.");
            return;
        }

        if (fileType === "owner_id_proof") {
            setOwnerIdProofFile(file);
            setOwnerIdProofPreviewName(file.name);
            setRemoveOwnerIdProof(false);
        } else if (fileType === "tenant_id_proof") {
            setTenantIdProofFile(file);
            setTenantIdProofPreviewName(file.name);
            setRemoveTenantIdProof(false);
        } else if (fileType === "rent_agreement") {
            setRentAgreementFile(file);
            setRentAgreementPreviewName(file.name);
            setRemoveRentAgreement(false);
        } else if (fileType === "member_id_proof" && idx !== null) {
            setMembers(prev =>
                prev.map((m, i) =>
                    i === idx
                        ? {
                              ...m,
                              idProofFile: file,
                              idProofPreviewName: file.name,
                              remove_id_proof: false
                          }
                        : m
                )
            );
        }
    };

    const handleRemoveFile = (fileType, idx = null) => {
        if (fileType === "owner_id_proof") {
            setOwnerIdProofFile(null);
            setOwnerIdProofPreviewName("");
            setExistingOwnerIdProofUrl(null);
            setRemoveOwnerIdProof(true);
        } else if (fileType === "tenant_id_proof") {
            setTenantIdProofFile(null);
            setTenantIdProofPreviewName("");
            setExistingTenantIdProofUrl(null);
            setRemoveTenantIdProof(true);
        } else if (fileType === "rent_agreement") {
            setRentAgreementFile(null);
            setRentAgreementPreviewName("");
            setExistingRentAgreementUrl(null);
            setRemoveRentAgreement(true);
        } else if (fileType === "member_id_proof" && idx !== null) {
            setMembers(prev =>
                prev.map((m, i) =>
                    i === idx
                        ? {
                              ...m,
                              idProofFile: null,
                              idProofPreviewName: "",
                              id_proof_url: null,
                              remove_id_proof: true
                          }
                        : m
                )
            );
        }
    };

    // --- Dynamic Members Controls ---
    const addMemberRow = (type) => {
        setMembers(prev => [
            ...prev,
            {
                id: null,
                name: "",
                mobile_number: "",
                email: "",
                emergency_contact: "",
                status: "active",
                member_type: type, // "Family Member" or "Tenant"
                idProofFile: null,
                idProofPreviewName: "",
                id_proof_url: null,
                remove_id_proof: false
            }
        ]);
    };

    const removeMemberRow = (idx) => {
        setMembers(prev => prev.filter((_, i) => i !== idx));
    };

    const updateMemberField = (idx, field, value) => {
        setMembers(prev =>
            prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
        );
    };

    // --- Add/Edit Handlers ---
    const handleEdit = async (resident) => {
        setLoading(true);
        try {
            const res = await getResidentById(resident.id);
            if (res.data && res.data.success) {
                const r = res.data.data;
                setSelectedId(r.id);
                setUnitId(r.unit_id);
                setHasOwner(!!r.has_owner);
                setHasTenant(!!r.has_tenant);

                // Set Owner Details
                setOwnerName(r.owner_name || "");
                setOwnerMobile(r.owner_mobile || "");
                setOwnerEmail(r.owner_email || "");
                setOwnerEmergencyContact(r.owner_emergency_contact || "");
                setOwnerStatus(r.owner_status || "active");
                setExistingOwnerIdProofUrl(r.owner_id_proof_url);
                setOwnerIdProofPreviewName(r.owner_id_proof || "");
                setRemoveOwnerIdProof(false);

                if (r.owner_move_in_date) {
                    setOwnerMoveInDate(new Date(r.owner_move_in_date).toISOString().split("T")[0]);
                } else {
                    setOwnerMoveInDate("");
                }

                // Set Tenant Details
                setTenantName(r.tenant_name || "");
                setTenantMobile(r.tenant_mobile || "");
                setTenantEmail(r.tenant_email || "");
                setTenantEmergencyContact(r.tenant_emergency_contact || "");
                setTenantStatus(r.tenant_status || "active");
                setExistingTenantIdProofUrl(r.tenant_id_proof_url);
                setTenantIdProofPreviewName(r.tenant_id_proof || "");
                setRemoveTenantIdProof(false);

                setExistingRentAgreementUrl(r.rent_agreement_url);
                setRentAgreementPreviewName(r.rent_agreement || "");
                setRemoveRentAgreement(false);

                if (r.tenant_move_in_date) {
                    setTenantMoveInDate(new Date(r.tenant_move_in_date).toISOString().split("T")[0]);
                } else {
                    setTenantMoveInDate("");
                }

                // Load Child Members
                if (r.members && Array.isArray(r.members)) {
                    setMembers(
                        r.members.map(m => ({
                            id: m.id,
                            name: m.name,
                            mobile_number: m.mobile_number || "",
                            email: m.email || "",
                            emergency_contact: m.emergency_contact || "",
                            status: m.status,
                            member_type: m.member_type,
                            idProofFile: null,
                            idProofPreviewName: m.id_proof || "",
                            id_proof_url: m.id_proof_url,
                            remove_id_proof: false
                        }))
                    );
                } else {
                    setMembers([]);
                }

                setFormMode("edit");
            }
        } catch (error) {
            console.error("Error loading resident details:", error);
            toast.error("Failed to load resident details");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this resident profile? All associated documents, family members, and co-tenants will be permanently deleted.")) return;
        try {
            const res = await deleteResident(id);
            if (res.data && res.data.success) {
                toast.success("Resident profile deleted successfully");
                loadInitialData();
            }
        } catch (error) {
            console.error("Error deleting resident:", error);
            toast.error(error.response?.data?.message || "Failed to delete resident");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Primary Unit Validation
        if (!unitId) {
            toast.error("Please select an Assigned Unit");
            return;
        }

        if (!hasOwner && !hasTenant) {
            toast.error("Please enable Owner details, Tenant details, or both");
            return;
        }

        // 2. Owner validation if residing
        if (hasOwner) {
            if (!ownerName.trim() || !ownerMobile.trim() || !ownerEmail.trim() || !ownerMoveInDate || !ownerEmergencyContact.trim()) {
                toast.error("All Owner details highlighted with * are required");
                return;
            }
            if (!/^\d{10,15}$/.test(ownerMobile.trim())) {
                toast.error("Owner Mobile Number must be between 10 to 15 digits");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
                toast.error("Please enter a valid Owner Email Address");
                return;
            }
        }

        // 3. Tenant validation if residing
        if (hasTenant) {
            if (!tenantName.trim() || !tenantMobile.trim() || !tenantEmail.trim() || !tenantMoveInDate || !tenantEmergencyContact.trim()) {
                toast.error("All Tenant details highlighted with * are required");
                return;
            }
            if (!/^\d{10,15}$/.test(tenantMobile.trim())) {
                toast.error("Tenant Mobile Number must be between 10 to 15 digits");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail.trim())) {
                toast.error("Please enter a valid Tenant Email Address");
                return;
            }
        }

        // 4. Validate member sub-forms
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            // Skip validation if the section is turned off
            if (m.member_type === "Family Member" && !hasOwner) continue;
            if (m.member_type === "Tenant" && !hasTenant) continue;

            if (!m.name.trim()) {
                toast.error(`Please enter Name for Member #${i + 1}`);
                return;
            }
            if (m.mobile_number && !/^\d{10,15}$/.test(m.mobile_number.trim())) {
                toast.error(`Please enter a valid Mobile for Member #${i + 1} (10 to 15 digits)`);
                return;
            }
            if (m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim())) {
                toast.error(`Please enter a valid Email for Member #${i + 1}`);
                return;
            }
        }

        setSaving(true);

        const formData = new FormData();
        formData.append("unit_id", unitId);
        formData.append("has_owner", hasOwner ? "true" : "false");
        formData.append("has_tenant", hasTenant ? "true" : "false");

        // Append Owner Details
        formData.append("owner_name", ownerName.trim());
        formData.append("owner_mobile", ownerMobile.trim());
        formData.append("owner_email", ownerEmail.trim());
        formData.append("owner_move_in_date", ownerMoveInDate);
        formData.append("owner_emergency_contact", ownerEmergencyContact.trim());
        formData.append("owner_status", ownerStatus);
        formData.append("remove_owner_id_proof", removeOwnerIdProof ? "true" : "false");

        if (ownerIdProofFile && hasOwner) {
            formData.append("owner_id_proof", ownerIdProofFile);
        }

        // Append Tenant Details
        formData.append("tenant_name", tenantName.trim());
        formData.append("tenant_mobile", tenantMobile.trim());
        formData.append("tenant_email", tenantEmail.trim());
        formData.append("tenant_move_in_date", tenantMoveInDate);
        formData.append("tenant_emergency_contact", tenantEmergencyContact.trim());
        formData.append("tenant_status", tenantStatus);
        formData.append("remove_tenant_id_proof", removeTenantIdProof ? "true" : "false");
        formData.append("remove_rent_agreement", removeRentAgreement ? "true" : "false");

        if (tenantIdProofFile && hasTenant) {
            formData.append("tenant_id_proof", tenantIdProofFile);
        }
        if (rentAgreementFile && hasTenant) {
            formData.append("rent_agreement", rentAgreementFile);
        }

        // Filter and serialize dynamic child members
        const activeMembers = members.filter(m => {
            if (m.member_type === "Family Member" && !hasOwner) return false;
            if (m.member_type === "Tenant" && !hasTenant) return false;
            return true;
        });

        const serializedMembers = activeMembers.map((m, idx) => ({
            id: m.id,
            name: m.name.trim(),
            mobile_number: m.mobile_number ? m.mobile_number.trim() : null,
            email: m.email ? m.email.trim() : null,
            emergency_contact: m.emergency_contact ? m.emergency_contact.trim() : null,
            status: m.status,
            member_type: m.member_type,
            id_proof: m.idProofPreviewName || null,
            remove_id_proof: m.remove_id_proof
        }));

        formData.append("members", JSON.stringify(serializedMembers));

        // Append member files
        activeMembers.forEach((m, idx) => {
            if (m.idProofFile) {
                formData.append(`member_id_proof_${idx}`, m.idProofFile);
            }
        });

        try {
            let res;
            if (formMode === "create") {
                res = await createResident(formData);
                if (res.data && res.data.success) {
                    toast.success("Resident profile registered successfully");
                    resetForm();
                    loadInitialData();
                }
            } else {
                res = await updateResident(selectedId, formData);
                if (res.data && res.data.success) {
                    toast.success("Resident profile updated successfully");
                    resetForm();
                    loadInitialData();
                }
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error(error.response?.data?.message || "Failed to save resident profile");
        } finally {
            setSaving(false);
        }
    };

    // Filter members for UI list render
    const familyMembers = useMemo(() => members.filter(m => m.member_type === "Family Member"), [members]);
    const coTenants = useMemo(() => members.filter(m => m.member_type === "Tenant"), [members]);

    // Track index matching of dynamic members for file mapping
    const getMemberGlobalIndex = (member) => {
        // Return original index in global 'members' state
        return members.indexOf(member);
    };

    // --- DataTable Columns Definition ---
    const columns = useMemo(() => [
        {
            key: "unit_number",
            label: "Assigned Unit",
            sortable: true,
            minWidth: "200px",
            render: row => (
                <div className="flex flex-col">
                    <span className="font-extrabold text-slate-800 text-base">
                        Unit {row.unit_number} ({row.unit_type})
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <i className="fa-solid fa-building text-slate-400"></i>
                        {row.building_name || "Bungalow"}
                        {row.floor_name ? ` (Floor ${row.floor_name})` : ""}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        {row.society_name}
                    </span>
                </div>
            )
        },
        {
            key: "owner_details",
            label: "Owner Details",
            sortable: false,
            minWidth: "260px",
            render: row => row.has_owner ? (
                <div className="flex flex-col py-1">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <i className="fa-solid fa-user-tie text-blue-900 text-xs"></i> {row.owner_name}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                        <i className="fa-solid fa-phone text-slate-400 text-[10px] mr-1"></i> {row.owner_mobile}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                        <i className="fa-solid fa-envelope text-slate-400 text-[10px] mr-1"></i> {row.owner_email}
                    </span>
                    {row.owner_id_proof_url ? (
                        <a 
                            href={row.owner_id_proof_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[11px] text-indigo-600 hover:text-indigo-900 font-bold flex items-center gap-1 mt-1.5 hover:underline"
                        >
                            <i className="fa-solid fa-file-arrow-down"></i> View Owner ID
                        </a>
                    ) : (
                        <span className="text-[10px] text-slate-400 italic mt-1.5">No ID uploaded</span>
                    )}
                </div>
            ) : (
                <span className="text-xs text-slate-400 italic">Owner not residing</span>
            )
        },
        {
            key: "tenant_details",
            label: "Tenant Details",
            sortable: false,
            minWidth: "260px",
            render: row => row.has_tenant ? (
                <div className="flex flex-col py-1">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <i className="fa-solid fa-user-tag text-indigo-900 text-xs"></i> {row.tenant_name}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                        <i className="fa-solid fa-phone text-slate-400 text-[10px] mr-1"></i> {row.tenant_mobile}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                        <i className="fa-solid fa-envelope text-slate-400 text-[10px] mr-1"></i> {row.tenant_email}
                    </span>
                    
                    <div className="flex gap-3 mt-1.5">
                        {row.tenant_id_proof_url ? (
                            <a 
                                href={row.tenant_id_proof_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-indigo-600 hover:text-indigo-900 font-bold flex items-center gap-1 hover:underline"
                            >
                                <i className="fa-solid fa-file-arrow-down"></i> Tenant ID
                            </a>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">No ID</span>
                        )}

                        {row.rent_agreement_url ? (
                            <a 
                                href={row.rent_agreement_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-emerald-600 hover:text-emerald-950 font-bold flex items-center gap-1 hover:underline"
                            >
                                <i className="fa-solid fa-file-contract"></i> Rent Agreement
                            </a>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">No Rent Agr.</span>
                        )}
                    </div>
                </div>
            ) : (
                <span className="text-xs text-slate-400 italic">Not Rented</span>
            )
        },
        {
            key: "occupancy",
            label: "Occupancy Status",
            sortable: false,
            minWidth: "160px",
            render: row => {
                let badgeClass = "bg-slate-55 bg-slate-50 text-slate-700 border border-slate-200";
                if (row.has_owner && row.has_tenant) {
                    badgeClass = "bg-blue-50 text-blue-700 border border-blue-200";
                } else if (row.has_owner) {
                    badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                } else if (row.has_tenant) {
                    badgeClass = "bg-indigo-50 text-indigo-700 border border-indigo-200";
                }

                let text = "Vacant";
                if (row.has_owner && row.has_tenant) text = "Owner & Tenant";
                else if (row.has_owner) text = "Self Occupied";
                else if (row.has_tenant) text = "Rented";

                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>
                        {text}
                    </span>
                );
            }
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            render: row => (
                <div className="flex gap-1">
                    {canUpdate && (
                        <button
                            onClick={() => handleEdit(row)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Resident Profile"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(row.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Resident Profile"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        </button>
                    )}
                </div>
            )
        }
    ], [canUpdate, canDelete]);

    if (permissionLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[500px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="flex-1 p-6">
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl shadow-sm font-medium">
                    Access Denied: You do not have permission to access the Resident Module.
                </div>
            </div>
        );
    }

    const addBtn = canWrite && (
        <button
            onClick={() => {
                resetForm();
                setFormMode("create");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md hover:shadow-lg shadow-indigo-100 transition-all cursor-pointer hover:scale-105"
            title="Register New Resident Profile"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </button>
    );

    return (
        <div className="w-full flex-1 flex flex-col min-h-screen bg-slate-50/50">
            {/* TOP HEADER */}
            <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-people-roof text-blue-900"></i> Resident Module
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {formMode === "list" 
                            ? "View, filter, and manage registered unit owners, tenants, and family members." 
                            : formMode === "create" 
                            ? "Register a new resident occupancy profile." 
                            : "Update resident profile, uploaded documents, family members, or co-tenants."
                        }
                    </p>
                </div>

                {formMode !== "list" && (
                    <button
                        onClick={resetForm}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back to Residents
                    </button>
                )}
            </header>

            <main className="w-full flex-1 flex flex-col p-6">
                {/* FORM VIEW */}
                {formMode !== "list" && (
                    <div className="w-full space-y-6">
                        <form onSubmit={handleSubmit} className="w-full space-y-6">
                            
                            {/* ASSIGNED UNIT & OCCUPANTS SELECTOR */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-house"></i> Unit & Residency Status
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Assigned Unit <span className="text-rose-600">*</span>
                                        </label>
                                        <select
                                            value={unitId}
                                            onChange={(e) => setUnitId(e.target.value)}
                                            required
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 bg-white"
                                        >
                                            <option value="">-- Select Assigned Unit --</option>
                                            {units.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    Unit {u.unit_number} ({u.type}) - {u.building_name || "Bungalow"} - {u.society_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Who Resides in this Unit? <span className="text-rose-600">*</span>
                                        </label>
                                        <div className="flex gap-6 py-2.5">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hasOwner}
                                                    onChange={(e) => setHasOwner(e.target.checked)}
                                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                />
                                                Owner
                                            </label>
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hasTenant}
                                                    onChange={(e) => setHasTenant(e.target.checked)}
                                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                />
                                                Tenant
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION A: OWNER INFORMATION */}
                            {hasOwner && (
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                                    <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-user-tie"></i> Owner Residing Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Owner Name <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={ownerName}
                                                onChange={(e) => setOwnerName(e.target.value)}
                                                required={hasOwner}
                                                placeholder="Owner Full Name"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Mobile Number <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={ownerMobile}
                                                onChange={(e) => setOwnerMobile(e.target.value)}
                                                required={hasOwner}
                                                placeholder="e.g. 9876543210"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Email Address <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={ownerEmail}
                                                onChange={(e) => setOwnerEmail(e.target.value)}
                                                required={hasOwner}
                                                placeholder="e.g. owner@example.com"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Move In Date <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={ownerMoveInDate}
                                                onChange={(e) => setOwnerMoveInDate(e.target.value)}
                                                required={hasOwner}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Emergency Contact <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={ownerEmergencyContact}
                                                onChange={(e) => setOwnerEmergencyContact(e.target.value)}
                                                required={hasOwner}
                                                placeholder="Name or Phone Number"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Owner Status <span className="text-rose-600">*</span>
                                            </label>
                                            <select
                                                value={ownerStatus}
                                                onChange={(e) => setOwnerStatus(e.target.value)}
                                                required={hasOwner}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 bg-white"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Owner ID Proof Upload */}
                                    <div className="space-y-2 max-w-md">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                            Owner ID Proof Document
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            {ownerIdProofPreviewName ? (
                                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                                        <i className="fa-solid fa-file-pdf text-rose-500 text-lg flex-shrink-0"></i>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-xs font-bold text-slate-700 truncate">{ownerIdProofPreviewName}</span>
                                                            {existingOwnerIdProofUrl && (
                                                                <a 
                                                                    href={existingOwnerIdProofUrl} 
                                                                    target="_blank" 
                                                                    rel="noreferrer" 
                                                                    className="text-[10px] text-indigo-600 font-bold hover:underline w-fit"
                                                                >
                                                                    View Uploaded ID
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile("owner_id_proof")}
                                                        className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-5 text-center bg-slate-50/50 flex flex-col items-center justify-center">
                                                    <i className="fa-solid fa-cloud-arrow-up text-slate-400 text-xl mb-1.5"></i>
                                                    <span className="text-xs text-slate-500 font-semibold mb-0.5">Upload Owner ID</span>
                                                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB)</span>
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleFileChange(e, "owner_id_proof")}
                                                        accept=".pdf,image/*"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* OWNER FAMILY MEMBERS LIST BUILDER */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                                                <i className="fa-solid fa-people-roof text-slate-400 text-sm"></i> Residing Family Members
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => addMemberRow("Family Member")}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-indigo-600 border border-indigo-200 bg-indigo-50/50 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer"
                                            >
                                                <i className="fa-solid fa-plus"></i> Add Family Member
                                            </button>
                                        </div>

                                        {familyMembers.length === 0 ? (
                                            <div className="text-center py-6 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                                No family members added.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {familyMembers.map((member, idx) => {
                                                    const globalIdx = getMemberGlobalIndex(member);
                                                    return (
                                                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 flex flex-col gap-3">
                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Family Member #{idx + 1}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeMemberRow(globalIdx)}
                                                                    className="text-rose-500 hover:text-rose-700 text-xs font-bold hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Name *</label>
                                                                    <input
                                                                        type="text"
                                                                        value={member.name}
                                                                        onChange={(e) => updateMemberField(globalIdx, "name", e.target.value)}
                                                                        placeholder="Name"
                                                                        required
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mobile</label>
                                                                    <input
                                                                        type="text"
                                                                        value={member.mobile_number}
                                                                        onChange={(e) => updateMemberField(globalIdx, "mobile_number", e.target.value)}
                                                                        placeholder="Mobile"
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Email</label>
                                                                    <input
                                                                        type="email"
                                                                        value={member.email}
                                                                        onChange={(e) => updateMemberField(globalIdx, "email", e.target.value)}
                                                                        placeholder="Email"
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Emergency Contact</label>
                                                                    <input
                                                                        type="text"
                                                                        value={member.emergency_contact}
                                                                        onChange={(e) => updateMemberField(globalIdx, "emergency_contact", e.target.value)}
                                                                        placeholder="Emergency Contact"
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status</label>
                                                                    <select
                                                                        value={member.status}
                                                                        onChange={(e) => updateMemberField(globalIdx, "status", e.target.value)}
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    >
                                                                        <option value="active">Active</option>
                                                                        <option value="inactive">Inactive</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ID Proof Document</label>
                                                                    {member.idProofPreviewName ? (
                                                                        <div className="flex items-center justify-between border border-slate-200 rounded-lg p-1 bg-white">
                                                                            <span className="text-[11px] font-medium text-slate-600 truncate max-w-[120px]" title={member.idProofPreviewName}>
                                                                                {member.idProofPreviewName}
                                                                            </span>
                                                                            <div className="flex items-center gap-1">
                                                                                {member.id_proof_url && (
                                                                                    <a href={member.id_proof_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-900 p-0.5">
                                                                                        <i className="fa-solid fa-eye text-xs"></i>
                                                                                    </a>
                                                                                )}
                                                                                <button type="button" onClick={() => handleRemoveFile("member_id_proof", globalIdx)} className="text-rose-500 hover:text-rose-700 p-0.5">
                                                                                    <i className="fa-solid fa-circle-xmark text-xs"></i>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="relative border border-dashed border-slate-300 hover:border-indigo-500 rounded-lg py-1 px-3 text-center bg-white flex items-center justify-center gap-1 cursor-pointer">
                                                                            <i className="fa-solid fa-file-arrow-up text-slate-400 text-xs"></i>
                                                                            <span className="text-[11px] text-slate-500 font-semibold">Upload ID</span>
                                                                            <input
                                                                                type="file"
                                                                                onChange={(e) => handleFileChange(e, "member_id_proof", globalIdx)}
                                                                                accept=".pdf,image/*"
                                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECTION B: TENANT INFORMATION */}
                            {hasTenant && (
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                                    <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-user-tag"></i> Tenant Residing Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Tenant Name <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={tenantName}
                                                onChange={(e) => setTenantName(e.target.value)}
                                                required={hasTenant}
                                                placeholder="Tenant Full Name"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Mobile Number <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={tenantMobile}
                                                onChange={(e) => setTenantMobile(e.target.value)}
                                                required={hasTenant}
                                                placeholder="e.g. 9876543210"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Email Address <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={tenantEmail}
                                                onChange={(e) => setTenantEmail(e.target.value)}
                                                required={hasTenant}
                                                placeholder="e.g. tenant@example.com"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Move In Date <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={tenantMoveInDate}
                                                onChange={(e) => setTenantMoveInDate(e.target.value)}
                                                required={hasTenant}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Emergency Contact <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={tenantEmergencyContact}
                                                onChange={(e) => setTenantEmergencyContact(e.target.value)}
                                                required={hasTenant}
                                                placeholder="Name or Phone Number"
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Tenant Status <span className="text-rose-600">*</span>
                                            </label>
                                            <select
                                                value={tenantStatus}
                                                onChange={(e) => setTenantStatus(e.target.value)}
                                                required={hasTenant}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 bg-white"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Tenant ID Proof & Rent Agreement Uploads */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                                Tenant ID Proof Document
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                {tenantIdProofPreviewName ? (
                                                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                            <i className="fa-solid fa-file-pdf text-rose-500 text-lg flex-shrink-0"></i>
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="text-xs font-bold text-slate-700 truncate">{tenantIdProofPreviewName}</span>
                                                                {existingTenantIdProofUrl && (
                                                                    <a 
                                                                        href={existingTenantIdProofUrl} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        className="text-[10px] text-indigo-600 font-bold hover:underline w-fit"
                                                                    >
                                                                        View Uploaded ID
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile("tenant_id_proof")}
                                                            className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer"
                                                        >
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-5 text-center bg-slate-50/50 flex flex-col items-center justify-center">
                                                        <i className="fa-solid fa-cloud-arrow-up text-slate-400 text-xl mb-1.5"></i>
                                                        <span className="text-xs text-slate-500 font-semibold mb-0.5">Upload Tenant ID</span>
                                                        <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB)</span>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => handleFileChange(e, "tenant_id_proof")}
                                                            accept=".pdf,image/*"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                                Rent Agreement Document <span className="text-rose-600">*</span>
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                {rentAgreementPreviewName ? (
                                                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                            <i className="fa-solid fa-file-contract text-emerald-500 text-lg flex-shrink-0"></i>
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="text-xs font-bold text-slate-700 truncate">{rentAgreementPreviewName}</span>
                                                                {existingRentAgreementUrl && (
                                                                    <a 
                                                                        href={existingRentAgreementUrl} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        className="text-[10px] text-indigo-600 font-bold hover:underline w-fit"
                                                                    >
                                                                        View Agreement
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile("rent_agreement")}
                                                            className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer"
                                                        >
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-5 text-center bg-slate-50/50 flex flex-col items-center justify-center">
                                                        <i className="fa-solid fa-file-invoice text-slate-400 text-xl mb-1.5"></i>
                                                        <span className="text-xs text-slate-500 font-semibold mb-0.5">Upload Rent Agreement</span>
                                                        <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB)</span>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => handleFileChange(e, "rent_agreement")}
                                                            accept=".pdf,image/*"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* TENANT CO-TENANTS LIST BUILDER */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                                                <i className="fa-solid fa-user-group text-slate-400 text-sm"></i> Residing Co-Tenants / Roommates
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => addMemberRow("Tenant")}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-indigo-600 border border-indigo-200 bg-indigo-50/50 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer"
                                            >
                                                <i className="fa-solid fa-plus"></i> Add Co-Tenant
                                            </button>
                                        </div>

                                        {coTenants.length === 0 ? (
                                            <div className="text-center py-6 bg-slate-50/30 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                                No co-tenants added.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {coTenants.map((member, idx) => {
                                                    const globalIdx = getMemberGlobalIndex(member);
                                                    return (
                                                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 flex flex-col gap-3">
                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Co-Tenant #{idx + 1}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeMemberRow(globalIdx)}
                                                                    className="text-rose-500 hover:text-rose-700 text-xs font-bold hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Name *</label>
                                                                    <input
                                                                        type="text"
                                                                        value={member.name}
                                                                        onChange={(e) => updateMemberField(globalIdx, "name", e.target.value)}
                                                                        placeholder="Name"
                                                                        required
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mobile</label>
                                                                    <input
                                                                        type="text"
                                                                        value={member.mobile_number}
                                                                        onChange={(e) => updateMemberField(globalIdx, "mobile_number", e.target.value)}
                                                                        placeholder="Mobile"
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Email</label>
                                                                    <input
                                                                        type="email"
                                                                        value={member.email}
                                                                        onChange={(e) => updateMemberField(globalIdx, "email", e.target.value)}
                                                                        placeholder="Email"
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Emergency Contact</label>
                                                                    <input
                                                                        type="text"
                                                                        value={member.emergency_contact}
                                                                        onChange={(e) => updateMemberField(globalIdx, "emergency_contact", e.target.value)}
                                                                        placeholder="Emergency Contact"
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status</label>
                                                                    <select
                                                                        value={member.status}
                                                                        onChange={(e) => updateMemberField(globalIdx, "status", e.target.value)}
                                                                        className="w-full box-border border border-slate-300 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-600 bg-white"
                                                                    >
                                                                        <option value="active">Active</option>
                                                                        <option value="inactive">Inactive</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ID Proof Document</label>
                                                                    {member.idProofPreviewName ? (
                                                                        <div className="flex items-center justify-between border border-slate-200 rounded-lg p-1 bg-white">
                                                                            <span className="text-[11px] font-medium text-slate-600 truncate max-w-[120px]" title={member.idProofPreviewName}>
                                                                                {member.idProofPreviewName}
                                                                            </span>
                                                                            <div className="flex items-center gap-1">
                                                                                {member.id_proof_url && (
                                                                                    <a href={member.id_proof_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-900 p-0.5">
                                                                                        <i className="fa-solid fa-eye text-xs"></i>
                                                                                    </a>
                                                                                )}
                                                                                <button type="button" onClick={() => handleRemoveFile("member_id_proof", globalIdx)} className="text-rose-500 hover:text-rose-700 p-0.5">
                                                                                    <i className="fa-solid fa-circle-xmark text-xs"></i>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="relative border border-dashed border-slate-300 hover:border-indigo-500 rounded-lg py-1 px-3 text-center bg-white flex items-center justify-center gap-1 cursor-pointer">
                                                                            <i className="fa-solid fa-file-arrow-up text-slate-400 text-xs"></i>
                                                                            <span className="text-[11px] text-slate-500 font-semibold">Upload ID</span>
                                                                            <input
                                                                                type="file"
                                                                                onChange={(e) => handleFileChange(e, "member_id_proof", globalIdx)}
                                                                                accept=".pdf,image/*"
                                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CANCEL / SUBMIT ROW */}
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl text-sm font-bold hover:shadow-lg shadow-indigo-100 hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                >
                                    {saving ? (
                                        <>
                                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-b-white animate-spin"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-circle-check"></i>
                                            {formMode === "create" ? "Register Resident" : "Save Changes"}
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                )}

                {/* LIST VIEW */}
                {formMode === "list" && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center min-h-[300px]">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <DataTable
                                data={residents}
                                columns={columns}
                                searchPlaceholder="Search by Owner / Tenant Name or Unit..."
                                searchKey="unit_number"
                                actionButton={addBtn}
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
