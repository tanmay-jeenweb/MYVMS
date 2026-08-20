import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import DataTable from "../../components/DataTable";
import { usePermission } from "../../context/PermissionContext";
import {
    getGuards,
    getGuardById,
    createGuard,
    updateGuard,
    deleteGuard,
    assignGuardGate
} from "../../api/guardApi";
import { getGates } from "../../api/gateApi";

export default function GuardModule() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canRead = hasPermission("guard_master", "read");
    const canWrite = hasPermission("guard_master", "write");
    const canUpdate = hasPermission("guard_master", "update");
    const canDelete = hasPermission("guard_master", "delete");

    const [guards, setGuards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formMode, setFormMode] = useState("list"); // "list", "create", "edit"
    const [selectedId, setSelectedId] = useState(null);

    // --- Form States ---
    const [fullName, setFullName] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [securityAgency, setSecurityAgency] = useState("");
    const [idProofRef, setIdProofRef] = useState("");
    const [joiningDate, setJoiningDate] = useState("");
    const [status, setStatus] = useState("active");

    // File Upload States
    const [docFile, setDocFile] = useState(null);
    const [docPreviewName, setDocPreviewName] = useState("");
    const [existingDocUrl, setExistingDocUrl] = useState(null);
    const [removeDoc, setRemoveDoc] = useState(false);

    // Assign Gate States
    const [gatesList, setGatesList] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedGuardForAssign, setSelectedGuardForAssign] = useState(null);
    const [assignedGateId, setAssignedGateId] = useState("");

    const [saving, setSaving] = useState(false);

    // --- Load List on Mount ---
    useEffect(() => {
        if (canRead) {
            loadInitialData();
        }
    }, [canRead]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [guardsRes, gatesRes] = await Promise.all([
                getGuards(),
                getGates().catch(() => ({ data: { success: true, data: [] } }))
            ]);
            if (guardsRes.data && guardsRes.data.success) {
                setGuards(guardsRes.data.data || []);
            }
            if (gatesRes.data && gatesRes.data.success) {
                setGatesList(gatesRes.data.data || []);
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
        setFullName("");
        setMobileNumber("");
        setSecurityAgency("");
        setIdProofRef("");
        setJoiningDate("");
        setStatus("active");
        setDocFile(null);
        setDocPreviewName("");
        setExistingDocUrl(null);
        setRemoveDoc(false);
        setSelectedGuardForAssign(null);
        setAssignedGateId("");
        setShowAssignModal(false);
        setSelectedId(null);
        setFormMode("list");
    };

    // Handle File Selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("ID document file size should not exceed 10MB.");
                return;
            }
            setDocFile(file);
            setDocPreviewName(file.name);
            setRemoveDoc(false);
        }
    };

    // Remove Selected or Existing File
    const handleRemoveFile = () => {
        setDocFile(null);
        setDocPreviewName("");
        setExistingDocUrl(null);
        setRemoveDoc(true);
    };

    // --- Add/Edit Handlers ---
    const handleEdit = async (guard) => {
        setLoading(true);
        try {
            const res = await getGuardById(guard.id);
            if (res.data && res.data.success) {
                const g = res.data.data;
                setSelectedId(g.id);
                setFullName(g.full_name);
                setMobileNumber(g.mobile_number);
                setSecurityAgency(g.security_agency);
                setIdProofRef(g.id_proof_ref);
                
                // Format joining date to YYYY-MM-DD
                if (g.joining_date) {
                    const d = new Date(g.joining_date);
                    const formattedDate = d.toISOString().split("T")[0];
                    setJoiningDate(formattedDate);
                } else {
                    setJoiningDate("");
                }

                setStatus(g.status);
                setExistingDocUrl(g.id_proof_doc_url);
                setDocPreviewName(g.id_proof_doc || "");
                setRemoveDoc(false);
                setFormMode("edit");
            }
        } catch (error) {
            console.error("Error loading guard details:", error);
            toast.error("Failed to load guard details");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this guard?")) return;
        try {
            const res = await deleteGuard(id);
            if (res.data && res.data.success) {
                toast.success("Guard deleted successfully");
                loadInitialData();
            }
        } catch (error) {
            console.error("Error deleting guard:", error);
            toast.error(error.response?.data?.message || "Failed to delete guard");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!fullName.trim() || !mobileNumber.trim() || !securityAgency.trim() || !idProofRef.trim() || !joiningDate) {
            toast.error("All fields highlighted with * are required");
            return;
        }

        // Mobile validation
        if (!/^\d{10,15}$/.test(mobileNumber.trim())) {
            toast.error("Please enter a valid Mobile Number (10 to 15 digits)");
            return;
        }

        setSaving(true);

        const formData = new FormData();
        formData.append("full_name", fullName.trim());
        formData.append("mobile_number", mobileNumber.trim());
        formData.append("security_agency", securityAgency.trim());
        formData.append("id_proof_ref", idProofRef.trim());
        formData.append("joining_date", joiningDate);
        formData.append("status", status);
        formData.append("removeDoc", removeDoc ? "true" : "false");

        if (docFile) {
            formData.append("doc", docFile);
        }

        try {
            let res;
            if (formMode === "create") {
                res = await createGuard(formData);
                if (res.data && res.data.success) {
                    toast.success("Guard registered successfully");
                    resetForm();
                    loadInitialData();
                }
            } else {
                res = await updateGuard(selectedId, formData);
                if (res.data && res.data.success) {
                    toast.success("Guard updated successfully");
                    resetForm();
                    loadInitialData();
                }
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error(error.response?.data?.message || "Failed to save guard");
        } finally {
            setSaving(false);
        }
    };

    // --- DataTable Columns Definition ---
    const columns = useMemo(() => [
        {
            key: "full_name",
            label: "Guard Details",
            sortable: true,
            minWidth: "220px",
            render: row => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-base">{row.full_name}</span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <i className="fa-solid fa-phone text-slate-400"></i> {row.mobile_number}
                    </span>
                </div>
            )
        },
        {
            key: "security_agency",
            label: "Security Agency",
            sortable: true,
            minWidth: "180px",
            render: row => <span className="font-semibold text-slate-700">{row.security_agency}</span>
        },
        {
            key: "id_proof",
            label: "ID Verification",
            sortable: true,
            minWidth: "200px",
            render: row => (
                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 w-fit">
                        {row.id_proof_ref}
                    </span>
                    {row.id_proof_doc_url ? (
                        <a 
                            href={row.id_proof_doc_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-indigo-600 hover:text-indigo-900 font-bold flex items-center gap-1.5 mt-0.5 hover:underline"
                        >
                            <i className="fa-solid fa-file-arrow-down"></i> View ID Document
                        </a>
                    ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">No Doc Uploaded</span>
                    )}
                </div>
            )
        },
        {
            key: "joining_date",
            label: "Joining Date",
            sortable: true,
            minWidth: "130px",
            render: row => (
                <span className="text-xs text-slate-600 font-semibold">
                    {row.joining_date ? new Date(row.joining_date).toLocaleDateString() : "-"}
                </span>
            )
        },
        {
            key: "gate_name",
            label: "Assigned Gate",
            sortable: true,
            minWidth: "160px",
            render: row => row.gate_name ? (
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 rounded-lg px-2.5 py-1">
                    {row.gate_name}
                </span>
            ) : (
                <span className="text-xs text-slate-400 italic font-medium">Not Assigned</span>
            )
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            minWidth: "120px",
            render: row => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    row.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {row.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            render: row => (
                <div className="flex gap-1">
                    {canUpdate && (
                        <button
                            onClick={() => {
                                setSelectedGuardForAssign(row);
                                setAssignedGateId(row.gate_id || "");
                                setShowAssignModal(true);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Assign Gate"
                        >
                            <i className="fa-solid fa-door-open text-xs"></i>
                        </button>
                    )}
                    {canUpdate && (
                        <button
                            onClick={() => handleEdit(row)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Guard"
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
                            title="Delete Guard"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        </button>
                    )}
                </div>
            )
        }
    ], [canUpdate, canDelete, gatesList]);

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
                    Access Denied: You do not have permission to access the Guards Module.
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
            title="Register New Guard"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </button>
    );

    return (
        <div className="w-full flex-1 flex flex-col min-h-screen bg-slate-50/50">
            {/* TOP BAR / NAVIGATION HEADER */}
            <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-blue-900"></i> Guards Module
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {formMode === "list" 
                            ? "View, filter, and manage registered security guards profile." 
                            : formMode === "create" 
                            ? "Register a new security guard profile." 
                            : "Update guard information, security agency details, and uploaded ID documents."
                        }
                    </p>
                </div>

                {formMode !== "list" && (
                    <button
                        onClick={resetForm}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back to Guards
                    </button>
                )}
            </header>

            <main className="w-full flex-1 flex flex-col p-6">
                {/* FORM VIEW */}
                {formMode !== "list" && (
                    <div className="w-full space-y-6">
                        <form onSubmit={handleSubmit} className="w-full space-y-6">
                            
                            {/* Section 1: Guard Profile */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Guard Information
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Full Name <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                            placeholder="e.g. John Doe"
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Mobile Number <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={mobileNumber}
                                            onChange={(e) => setMobileNumber(e.target.value)}
                                            required
                                            placeholder="e.g. 9876543210"
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Security Agency <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={securityAgency}
                                            onChange={(e) => setSecurityAgency(e.target.value)}
                                            required
                                            placeholder="e.g. Apex Security Solutions"
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Joining Date <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={joiningDate}
                                            onChange={(e) => setJoiningDate(e.target.value)}
                                            required
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: ID Verification Documents */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    ID Verification & Document Attachment
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            ID Proof Ref <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={idProofRef}
                                            onChange={(e) => setIdProofRef(e.target.value)}
                                            required
                                            placeholder="e.g. Aadhar: 1234-5678-9012 or Driving License"
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            ID Proof Document File
                                        </label>
                                        
                                        <div className="flex flex-col gap-2">
                                            <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-4 bg-slate-50 text-center flex flex-col items-center justify-center transition-colors">
                                                <i className="fa-solid fa-file-pdf text-slate-400 text-3xl mb-2"></i>
                                                <span className="block text-xs text-slate-600 font-bold max-w-[200px] truncate">
                                                    {docPreviewName ? docPreviewName : "Choose PDF, image or doc file"}
                                                </span>
                                                <span className="block text-[10px] text-slate-400 mt-0.5">Max size 10MB</span>
                                                
                                                <input
                                                    type="file"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                />
                                            </div>

                                            {(docPreviewName || existingDocUrl) && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveFile}
                                                    className="w-fit text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-lg hover:bg-rose-100 transition-colors"
                                                >
                                                    Remove Document
                                                </button>
                                            )}

                                            {existingDocUrl && (
                                                <a 
                                                    href={existingDocUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 w-fit mt-1"
                                                >
                                                    <i className="fa-solid fa-external-link"></i> View Existing Document
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : formMode === "create" ? "Register Guard" : "Save Changes"}
                                </button>
                            </div>

                        </form>
                    </div>
                )}

                {/* LIST VIEW */}
                {formMode === "list" && (
                    <div className="w-full flex-1 flex flex-col mb-8">
                        <DataTable
                            tableId="guards_master_list"
                            title="Guards Master"
                            data={guards}
                            columns={columns}
                            loading={loading}
                            actionButton={addBtn}
                            searchPlaceholder="Search by full name, mobile, security agency..."
                        />
                    </div>
                )}
            </main>

            {/* ASSIGN GATE MODAL */}
            {showAssignModal && selectedGuardForAssign && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 16
                }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-extrabold text-base">Assign Gate</h3>
                                <p className="text-xs text-blue-100 mt-0.5">Assign a gateway for {selectedGuardForAssign.full_name}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedGuardForAssign(null);
                                }}
                                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg border-none cursor-pointer flex items-center justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                    Select Gate Point
                                </label>
                                <select
                                    value={assignedGateId}
                                    onChange={(e) => setAssignedGateId(e.target.value)}
                                    className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                >
                                    <option value="">-- Unassigned / No Gate --</option>
                                    {gatesList.map(gate => (
                                        <option key={gate.id} value={gate.id}>
                                            {gate.gate_name} ({gate.gate_type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedGuardForAssign(null);
                                }}
                                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        setSaving(true);
                                        const res = await assignGuardGate(selectedGuardForAssign.id, assignedGateId ? Number(assignedGateId) : null);
                                        if (res.data && res.data.success) {
                                            toast.success("Gate assigned successfully");
                                            setShowAssignModal(false);
                                            setSelectedGuardForAssign(null);
                                            loadInitialData();
                                        }
                                    } catch (error) {
                                        console.error("Assign gate error:", error);
                                        toast.error("Failed to assign gate");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Assignment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
