import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import DataTable from "../../components/DataTable";
import { usePermission } from "../../context/PermissionContext";
import { getSocieties, getSocietyById } from "../../api/societyApi";
import {
    getUnits,
    getUnitById,
    createUnit,
    updateUnit,
    deleteUnit
} from "../../api/unitApi";

export default function UnitModule() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canRead = hasPermission("unit_module", "read");
    const canWrite = hasPermission("unit_module", "write");
    const canUpdate = hasPermission("unit_module", "update");
    const canDelete = hasPermission("unit_module", "delete");

    const [units, setUnits] = useState([]);
    const [societies, setSocieties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formMode, setFormMode] = useState("list"); // "list", "create", "edit"
    const [selectedId, setSelectedId] = useState(null);

    // --- Form States ---
    const [selectedSocietyId, setSelectedSocietyId] = useState("");
    const [selectedSocietyType, setSelectedSocietyType] = useState(""); // "flat", "bungalow", "both"
    const [unitCategory, setUnitCategory] = useState("flat"); // "flat", "bungalow"
    const [buildingsList, setBuildingsList] = useState([]);
    const [floorsList, setFloorsList] = useState([]); // all floors for selected society
    
    const [selectedBuildingId, setSelectedBuildingId] = useState("");
    const [selectedFloorId, setSelectedFloorId] = useState("");
    const [unitNumber, setUnitNumber] = useState("");
    const [unitType, setUnitType] = useState("2BHK"); // '2BHK', '3BHK', '4BHK', 'Penthouse'
    const [area, setArea] = useState("");
    const [occupancy, setOccupancy] = useState("Vacant"); // 'Self Occupied', 'Rented', 'Vacant'
    const [status, setStatus] = useState("active"); // 'active', 'inactive'
    
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
            const [unitsRes, socRes] = await Promise.all([
                getUnits(),
                getSocieties()
            ]);
            if (unitsRes.data.success) {
                setUnits(unitsRes.data.data);
            }
            if (socRes.data.success) {
                setSocieties(socRes.data.data);
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
            toast.error("Failed to load records");
        } finally {
            setLoading(false);
        }
    };

    // --- Load Society Detail when Society is Selected ---
    useEffect(() => {
        if (!selectedSocietyId) {
            setSelectedSocietyType("");
            setBuildingsList([]);
            setFloorsList([]);
            setSelectedBuildingId("");
            setSelectedFloorId("");
            return;
        }

        const fetchSocietyDetails = async () => {
            try {
                const res = await getSocietyById(selectedSocietyId);
                if (res.data.success) {
                    const data = res.data.data;
                    setSelectedSocietyType(data.type);
                    setBuildingsList(data.buildings || []);
                    setFloorsList(data.floors || []);
                    
                    // Auto-resolve unit category
                    if (data.type === "flat") {
                        setUnitCategory("flat");
                    } else if (data.type === "bungalow") {
                        setUnitCategory("bungalow");
                    }
                }
            } catch (error) {
                console.error("Error loading society details:", error);
                toast.error("Failed to load society structure details");
            }
        };

        fetchSocietyDetails();
    }, [selectedSocietyId]);

    // --- Filtered Floors list based on selected Building ---
    const filteredFloors = useMemo(() => {
        if (!selectedBuildingId) return [];
        return floorsList.filter(f => f.building_id === Number(selectedBuildingId));
    }, [selectedBuildingId, floorsList]);

    // Reset Building and Floor when society selection changes
    const handleSocietyChange = (e) => {
        setSelectedSocietyId(e.target.value);
        setSelectedBuildingId("");
        setSelectedFloorId("");
        setUnitCategory("flat");
    };

    // Reset floor when building selection changes
    const handleBuildingChange = (e) => {
        setSelectedBuildingId(e.target.value);
        setSelectedFloorId("");
    };

    // --- Reset Form Fields ---
    const resetForm = () => {
        setSelectedSocietyId("");
        setSelectedSocietyType("");
        setBuildingsList([]);
        setFloorsList([]);
        setSelectedBuildingId("");
        setSelectedFloorId("");
        setUnitCategory("flat");
        setUnitNumber("");
        setUnitType("2BHK");
        setArea("");
        setOccupancy("Vacant");
        setStatus("active");
        setSelectedId(null);
        setFormMode("list");
    };

    // --- Add/Edit Handlers ---
    const handleEdit = async (unit) => {
        setLoading(true);
        try {
            const res = await getUnitById(unit.id);
            if (res.data.success) {
                const u = res.data.data;
                // Important: set society ID first, which triggers the loading of buildings and floors via useEffect
                setSelectedSocietyId(u.society_id);
                setSelectedId(u.id);
                setUnitNumber(u.unit_number);
                setUnitType(u.type);
                setArea(u.area || "");
                setOccupancy(u.occupancy);
                setStatus(u.status);

                // Since society details load asynchronously, set building and floor IDs using a timeout to ensure list binds first
                setTimeout(() => {
                    setUnitCategory(u.unit_category || "flat");
                    setSelectedBuildingId(u.building_id || "");
                    setSelectedFloorId(u.floor_id || "");
                    setLoading(false);
                    setFormMode("edit");
                }, 500);
            }
        } catch (error) {
            console.error("Error loading unit:", error);
            toast.error("Failed to load unit details");
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this unit?")) return;
        try {
            const res = await deleteUnit(id);
            if (res.data.success) {
                toast.success("Unit deleted successfully");
                loadInitialData();
            }
        } catch (error) {
            console.error("Error deleting unit:", error);
            toast.error(error.response?.data?.message || "Failed to delete unit");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedSocietyId || !unitNumber || !unitType) {
            toast.error("Society, Unit Number, and Accommodation Type are required");
            return;
        }

        // Validate that building and floor are selected if category is flat
        if (unitCategory === "flat") {
            if (!selectedBuildingId) {
                toast.error("Please select a Building");
                return;
            }
            if (!selectedFloorId) {
                toast.error("Please select a Floor");
                return;
            }
        }

        setSaving(true);

        const payload = {
            society_id: Number(selectedSocietyId),
            building_id: unitCategory === "flat" && selectedBuildingId ? Number(selectedBuildingId) : null,
            floor_id: unitCategory === "flat" && selectedFloorId ? Number(selectedFloorId) : null,
            unit_category: unitCategory,
            unit_number: unitNumber.trim(),
            type: unitType,
            area: area.trim(),
            occupancy: occupancy,
            status: status
        };

        try {
            let res;
            if (formMode === "create") {
                res = await createUnit(payload);
                if (res.data.success) {
                    toast.success("Unit created successfully");
                    resetForm();
                    loadInitialData();
                }
            } else {
                res = await updateUnit(selectedId, payload);
                if (res.data.success) {
                    toast.success("Unit updated successfully");
                    resetForm();
                    loadInitialData();
                }
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error(error.response?.data?.message || "Failed to save unit");
        } finally {
            setSaving(false);
        }
    };

    // --- DataTable Columns Definition ---
    const columns = useMemo(() => [
        {
            name: "Unit Number",
            selector: row => row.unit_number,
            sortable: true,
            cell: row => <span className="font-bold text-slate-800">{row.unit_number}</span>
        },
        {
            name: "Society",
            selector: row => row.society_name,
            sortable: true,
            cell: row => (
                <div>
                    <span className="font-semibold text-slate-700 block">{row.society_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.society_code}</span>
                </div>
            )
        },
        {
            name: "Structure",
            selector: row => row.unit_category,
            sortable: true,
            cell: row => {
                if (row.unit_category === "bungalow") {
                    return <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Bungalow</span>;
                }
                return (
                    <div className="text-xs text-slate-600">
                        <span className="font-semibold">{row.building_name}</span>
                        <span className="text-slate-400 mx-1">›</span>
                        <span>{row.floor_name}</span>
                    </div>
                );
            }
        },
        {
            name: "Type",
            selector: row => row.type,
            sortable: true,
            cell: row => <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{row.type}</span>
        },
        {
            name: "Area",
            selector: row => row.area || "-",
            sortable: true
        },
        {
            name: "Occupancy",
            selector: row => row.occupancy,
            sortable: true,
            cell: row => {
                let badgeClass = "bg-slate-50 text-slate-700";
                if (row.occupancy === "Self Occupied") badgeClass = "bg-emerald-50 text-emerald-700";
                if (row.occupancy === "Rented") badgeClass = "bg-sky-50 text-sky-700";
                if (row.occupancy === "Vacant") badgeClass = "bg-amber-50 text-amber-600";

                return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{row.occupancy}</span>;
            }
        },
        {
            name: "Status",
            selector: row => row.status,
            sortable: true,
            cell: row => (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    row.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                    {row.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            name: "Actions",
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "120px",
            cell: row => (
                <div className="flex gap-1">
                    {canUpdate && (
                        <button
                            onClick={() => handleEdit(row)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Unit"
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
                            title="Delete Unit"
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
                    Access Denied: You do not have permission to access the Unit Module.
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex-1 flex flex-col min-h-screen bg-slate-50/50">
            {/* TOP BAR / NAVIGATION HEADER */}
            <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-house-chimney text-blue-900"></i> Unit Module
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {formMode === "list" 
                            ? "View, filter, and manage residential and bungalow units." 
                            : formMode === "create" 
                            ? "Register a new unit within a society." 
                            : "Update existing unit specification and occupancy details."
                        }
                    </p>
                </div>

                {formMode !== "list" && (
                    <button
                        onClick={resetForm}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back to Units
                    </button>
                )}
            </header>

            <main className="w-full flex-1 flex flex-col p-6">
                {/* FORM VIEW */}
                {formMode !== "list" && (
                    <div className="w-full max-w-4xl mx-auto space-y-6">
                        <form onSubmit={handleSubmit} className="w-full space-y-6">
                            
                            {/* SECTION 1: Structural Setup */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Structural Linkage
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Select Society <span className="text-rose-600">*</span>
                                        </label>
                                        <select
                                            value={selectedSocietyId}
                                            onChange={handleSocietyChange}
                                            required
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                        >
                                            <option value="">-- Choose Society --</option>
                                            {societies.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.society_name} ({s.society_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Category Selection (Conditional) */}
                                    {selectedSocietyId && selectedSocietyType === "both" && (
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Unit Category <span className="text-rose-600">*</span>
                                            </label>
                                            <select
                                                value={unitCategory}
                                                onChange={(e) => {
                                                    setUnitCategory(e.target.value);
                                                    setSelectedBuildingId("");
                                                    setSelectedFloorId("");
                                                }}
                                                required
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                            >
                                                <option value="flat">Flat / Apartment</option>
                                                <option value="bungalow">Bungalow</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Building Selection (Conditional) */}
                                    {selectedSocietyId && unitCategory === "flat" && (
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Select Building/Tower <span className="text-rose-600">*</span>
                                            </label>
                                            <select
                                                value={selectedBuildingId}
                                                onChange={handleBuildingChange}
                                                required
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                            >
                                                <option value="">-- Choose Building --</option>
                                                {buildingsList.map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.name} ({b.code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Floor Selection (Conditional) */}
                                    {selectedSocietyId && unitCategory === "flat" && (
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Select Floor <span className="text-rose-600">*</span>
                                            </label>
                                            <select
                                                value={selectedFloorId}
                                                onChange={(e) => setSelectedFloorId(e.target.value)}
                                                required
                                                disabled={!selectedBuildingId}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-400"
                                            >
                                                <option value="">
                                                    {selectedBuildingId ? "-- Choose Floor --" : "Select Building First"}
                                                </option>
                                                {filteredFloors.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.name} (Flats: {f.num_flats})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: Unit details */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Unit Specifications
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Unit Number <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 101, B-502"
                                            value={unitNumber}
                                            onChange={(e) => setUnitNumber(e.target.value)}
                                            required
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Accommodation Type <span className="text-rose-600">*</span>
                                        </label>
                                        <select
                                            value={unitType}
                                            onChange={(e) => setUnitType(e.target.value)}
                                            required
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                        >
                                            <option value="2BHK">2BHK</option>
                                            <option value="3BHK">3BHK</option>
                                            <option value="4BHK">4BHK</option>
                                            <option value="Penthouse">Penthouse</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Area (Sq. Ft.)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1200 or 1500 sq ft"
                                            value={area}
                                            onChange={(e) => setArea(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: Occupancy & Status */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Occupancy & Status
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Occupancy Status
                                        </label>
                                        <select
                                            value={occupancy}
                                            onChange={(e) => setOccupancy(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600 font-semibold"
                                        >
                                            <option value="Vacant">Vacant</option>
                                            <option value="Self Occupied">Self Occupied</option>
                                            <option value="Rented">Rented</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Unit Status
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

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    disabled={saving}
                                    className="py-2.5 px-6 rounded-xl border border-slate-300 text-slate-600 bg-white font-semibold text-sm cursor-pointer transition-colors hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`py-2.5 px-8 rounded-xl border-none text-white font-bold text-sm transition-all duration-200 ${
                                        saving ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-900 to-indigo-900 cursor-pointer shadow-md hover:shadow-lg shadow-indigo-100 hover:scale-[1.01]"
                                    }`}
                                >
                                    {saving ? "Saving..." : formMode === "create" ? "Create Unit" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* LIST VIEW */}
                {formMode === "list" && (
                    <div className="w-full flex-1 flex flex-col">
                        <DataTable
                            tableId="unit_module_list"
                            title="Units List"
                            data={units}
                            columns={columns}
                            loading={loading}
                            searchPlaceholder="Search units by number, society name, type..."
                            actionButton={
                                canWrite ? (
                                    <button
                                        onClick={() => setFormMode("create")}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md hover:shadow-lg shadow-indigo-100 transition-all cursor-pointer hover:scale-105"
                                        title="Add New Unit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </button>
                                ) : null
                            }
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
