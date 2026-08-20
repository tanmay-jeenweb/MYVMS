import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import DataTable from "../../components/DataTable";
import { usePermission } from "../../context/PermissionContext";
import {
    getGates,
    getGateById,
    createGate,
    updateGate,
    deleteGate
} from "../../api/gateApi";

export default function GateModule() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canRead = hasPermission("gate_master", "read");
    const canWrite = hasPermission("gate_master", "write");
    const canUpdate = hasPermission("gate_master", "update");
    const canDelete = hasPermission("gate_master", "delete");

    const [gates, setGates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formMode, setFormMode] = useState("list"); // "list", "create", "edit"
    const [selectedId, setSelectedId] = useState(null);

    // --- Form States ---
    const [gateName, setGateName] = useState("");
    const [gateType, setGateType] = useState(""); // 'Main gate', 'secondary gate', 'service gate', 'emergancy gate'
    const [locationDescription, setLocationDescription] = useState("");
    const [allowVisitorEntry, setAllowVisitorEntry] = useState(false);
    const [allowStaffEntry, setAllowStaffEntry] = useState(false);
    const [qrScannerEnabled, setQRScannerEnabled] = useState(false);
    const [otpEntryEnabled, setOTPEntryEnabled] = useState(false);
    const [openingTime, setOpeningTime] = useState("");
    const [closingTime, setClosingTime] = useState("");

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
            const res = await getGates();
            if (res.data && res.data.success) {
                setGates(res.data.data || []);
            }
        } catch (error) {
            console.error("Error loading gates data:", error);
            toast.error("Failed to load gate records");
        } finally {
            setLoading(false);
        }
    };

    // --- Reset Form Fields ---
    const resetForm = () => {
        setGateName("");
        setGateType("");
        setLocationDescription("");
        setAllowVisitorEntry(false);
        setAllowStaffEntry(false);
        setQRScannerEnabled(false);
        setOTPEntryEnabled(false);
        setOpeningTime("");
        setClosingTime("");
        setSelectedId(null);
        setFormMode("list");
    };

    // --- Add/Edit Handlers ---
    const handleEdit = async (gate) => {
        setLoading(true);
        try {
            const res = await getGateById(gate.id);
            if (res.data && res.data.success) {
                const g = res.data.data;
                setSelectedId(g.id);
                setGateName(g.gate_name);
                setGateType(g.gate_type);
                setLocationDescription(g.location_description || "");
                setAllowVisitorEntry(!!g.allow_visitor_entry);
                setAllowStaffEntry(!!g.allow_staff_entry);
                setQRScannerEnabled(!!g.qr_scanner_enabled);
                setOTPEntryEnabled(!!g.otp_entry_enabled);
                
                // Formats TIME value HH:MM:SS to HH:MM if necessary
                setOpeningTime(g.opening_time ? g.opening_time.substring(0, 5) : "");
                setClosingTime(g.closing_time ? g.closing_time.substring(0, 5) : "");

                setFormMode("edit");
            }
        } catch (error) {
            console.error("Error loading gate details:", error);
            toast.error("Failed to load gate details");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this gate?")) return;
        try {
            const res = await deleteGate(id);
            if (res.data && res.data.success) {
                toast.success("Gate deleted successfully");
                loadInitialData();
            }
        } catch (error) {
            console.error("Error deleting gate:", error);
            toast.error(error.response?.data?.message || "Failed to delete gate");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!gateName.trim() || !gateType) {
            toast.error("Gate Name and Gate Type are required");
            return;
        }

        setSaving(true);

        const payload = {
            gate_name: gateName.trim(),
            gate_type: gateType,
            location_description: locationDescription.trim() || null,
            allow_visitor_entry: allowVisitorEntry,
            allow_staff_entry: allowStaffEntry,
            qr_scanner_enabled: qrScannerEnabled,
            otp_entry_enabled: otpEntryEnabled,
            opening_time: openingTime || null,
            closing_time: closingTime || null
        };

        try {
            let res;
            if (formMode === "create") {
                res = await createGate(payload);
                if (res.data && res.data.success) {
                    toast.success("Gate created successfully");
                    resetForm();
                    loadInitialData();
                }
            } else {
                res = await updateGate(selectedId, payload);
                if (res.data && res.data.success) {
                    toast.success("Gate updated successfully");
                    resetForm();
                    loadInitialData();
                }
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error(error.response?.data?.message || "Failed to save gate");
        } finally {
            setSaving(false);
        }
    };

    // --- DataTable Columns Definition ---
    const columns = useMemo(() => [
        {
            key: "gate_name",
            label: "Gate Name",
            sortable: true,
            render: row => <span className="font-bold text-slate-800">{row.gate_name}</span>
        },
        {
            key: "gate_type",
            label: "Gate Type",
            sortable: true,
            render: row => (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    row.gate_type === 'Main gate' ? 'bg-indigo-50 text-indigo-700' :
                    row.gate_type === 'secondary gate' ? 'bg-sky-50 text-sky-700' :
                    row.gate_type === 'service gate' ? 'bg-amber-50 text-amber-700' :
                    'bg-rose-50 text-rose-700'
                }`}>
                    {row.gate_type}
                </span>
            )
        },
        {
            key: "location_description",
            label: "Location / Description",
            sortable: true,
            render: row => row.location_description || <span className="text-slate-400">—</span>
        },
        {
            key: "timings",
            label: "Operational Timings",
            sortable: false,
            render: row => {
                if (!row.opening_time && !row.closing_time) {
                    return <span className="text-slate-400">24 Hours / Unspecified</span>;
                }
                const formatTimeStr = (t) => t ? t.substring(0, 5) : "--:--";
                return (
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        {formatTimeStr(row.opening_time)} - {formatTimeStr(row.closing_time)}
                    </span>
                );
            }
        },
        {
            key: "permissions",
            label: "Rules & Verification",
            sortable: false,
            render: row => {
                const rules = [
                    { label: "Visitor", active: !!row.allow_visitor_entry, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
                    { label: "Staff", active: !!row.allow_staff_entry, color: "text-blue-700 bg-blue-50 border-blue-100" },
                    { label: "QR Pass", active: !!row.qr_scanner_enabled, color: "text-indigo-700 bg-indigo-50 border-indigo-100" },
                    { label: "OTP Verification", active: !!row.otp_entry_enabled, color: "text-purple-700 bg-purple-50 border-purple-100" }
                ].filter(r => r.active);
                
                if (rules.length === 0) {
                    return <span className="text-xs text-slate-400 italic">No rules enabled</span>;
                }
                
                return (
                    <div className="flex flex-wrap gap-1">
                        {rules.map((rule, idx) => (
                            <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${rule.color}`}>
                                {rule.label}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            key: "assigned_guards",
            label: "Assigned Guards",
            sortable: true,
            minWidth: "180px",
            render: row => row.assigned_guards ? (
                <div className="flex flex-wrap gap-1">
                    {row.assigned_guards.split(', ').map((guard, idx) => (
                        <span key={idx} className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                            <i className="fa-solid fa-user-shield text-slate-400"></i> {guard}
                        </span>
                    ))}
                </div>
            ) : (
                <span className="text-xs text-slate-400 italic font-medium">No Guards Assigned</span>
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
                            onClick={() => handleEdit(row)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Gate"
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
                            title="Delete Gate"
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
                    Access Denied: You do not have permission to access the Gate Module.
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
            title="Add New Gate"
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
                        <i className="fa-solid fa-door-open text-blue-900"></i> Gate Module
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {formMode === "list" 
                            ? "View, filter, and manage physical gate points." 
                            : formMode === "create" 
                            ? "Configure a new gate point." 
                            : "Update gate rules and operational timings."
                        }
                    </p>
                </div>

                {formMode !== "list" && (
                    <button
                        onClick={resetForm}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back to Gates
                    </button>
                )}
            </header>

            <main className="w-full flex-1 flex flex-col p-6">
                {/* FORM VIEW */}
                {formMode !== "list" && (
                    <div className="w-full max-w-4xl mx-auto space-y-6">
                        <form onSubmit={handleSubmit} className="w-full space-y-6">
                            
                            {/* Section 1: Gate Profile */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Gate Profile
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Gate Name <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={gateName}
                                            onChange={(e) => setGateName(e.target.value)}
                                            required
                                            placeholder="e.g. North Main Gate"
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Gate Type <span className="text-rose-600">*</span>
                                        </label>
                                        <select
                                            value={gateType}
                                            onChange={(e) => setGateType(e.target.value)}
                                            required
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                        >
                                            <option value="">-- Select Gate Type --</option>
                                            <option value="Main gate">Main gate</option>
                                            <option value="secondary gate">secondary gate</option>
                                            <option value="service gate">service gate</option>
                                            <option value="emergancy gate">emergancy gate</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                        Location / Description
                                    </label>
                                    <textarea
                                        value={locationDescription}
                                        onChange={(e) => setLocationDescription(e.target.value)}
                                        placeholder="Describe gate location, physical access pointers..."
                                        rows={3}
                                        className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Permissions & Verification Rules */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Gate Permissions & Verification Rules
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50/50 cursor-pointer select-none transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={allowVisitorEntry}
                                            onChange={(e) => setAllowVisitorEntry(e.target.checked)}
                                            className="accent-indigo-600 h-4.5 w-4.5 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block">Allow Visitor Entry</span>
                                            <span className="text-xs text-slate-400">Permit check-ins for registered visitors at this gate.</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50/50 cursor-pointer select-none transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={allowStaffEntry}
                                            onChange={(e) => setAllowStaffEntry(e.target.checked)}
                                            className="accent-indigo-600 h-4.5 w-4.5 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block">Allow Staff Entry</span>
                                            <span className="text-xs text-slate-400">Allow employees, workers, and operators entry here.</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50/50 cursor-pointer select-none transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={qrScannerEnabled}
                                            onChange={(e) => setQRScannerEnabled(e.target.checked)}
                                            className="accent-indigo-600 h-4.5 w-4.5 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block">QR Scanner Enabled</span>
                                            <span className="text-xs text-slate-400">Enable validation of QR-code passes at this terminal.</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50/50 cursor-pointer select-none transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={otpEntryEnabled}
                                            onChange={(e) => setOTPEntryEnabled(e.target.checked)}
                                            className="accent-indigo-600 h-4.5 w-4.5 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block">OTP Entry Enabled</span>
                                            <span className="text-xs text-slate-400">Require one-time passcode verification for entry.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Section 3: Operational Timings */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Operational Timings
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Opening Time
                                        </label>
                                        <input
                                            type="time"
                                            value={openingTime}
                                            onChange={(e) => setOpeningTime(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Closing Time
                                        </label>
                                        <input
                                            type="time"
                                            value={closingTime}
                                            onChange={(e) => setClosingTime(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
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
                                    {saving ? "Saving..." : formMode === "create" ? "Create Gate" : "Update Gate"}
                                </button>
                            </div>

                        </form>
                    </div>
                )}

                {/* LIST VIEW */}
                {formMode === "list" && (
                    <div className="w-full flex-1 flex flex-col mb-8">
                        <DataTable
                            tableId="gates_master_list"
                            title="Gates Master"
                            data={gates}
                            columns={columns}
                            loading={loading}
                            actionButton={addBtn}
                            searchPlaceholder="Search by gate name, type, location..."
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
