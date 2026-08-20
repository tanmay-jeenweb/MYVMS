import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import DataTable from "../../components/DataTable";
import { usePermission } from "../../context/PermissionContext";
import {
    getSocieties,
    getSocietyById,
    createSociety,
    updateSociety,
    deleteSociety
} from "../../api/societyApi";

export default function SocietyModule() {
    const { hasPermission, loading: permissionLoading } = usePermission();
    const canRead = hasPermission("society_master", "read");
    const canWrite = hasPermission("society_master", "write");
    const canUpdate = hasPermission("society_master", "update");
    const canDelete = hasPermission("society_master", "delete");

    const [societies, setSocieties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formMode, setFormMode] = useState("list"); // "list", "create", "edit"
    const [selectedId, setSelectedId] = useState(null);

    // --- Form States ---
    const [societyName, setSocietyName] = useState("");
    const [societyCode, setSocietyCode] = useState("");
    const [regNumber, setRegNumber] = useState("");
    const [societyStatus, setSocietyStatus] = useState("active");
    const [streetAddress, setStreetAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [pincode, setPincode] = useState("");
    const [officeContact, setOfficeContact] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [securityContact, setSecurityContact] = useState("");
    const [societyType, setSocietyType] = useState("both"); // "flat", "bungalow", "both"
    
    // Image Upload States
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingImageUrl, setExistingImageUrl] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);

    // Buildings & Floors lists in state
    const [buildings, setBuildings] = useState([]);
    const [floors, setFloors] = useState([]);

    // --- Subform States (Add Building) ---
    const [bldgName, setBldgName] = useState("");
    const [bldgCode, setBldgCode] = useState("");
    const [bldgFloors, setBldgFloors] = useState("");
    const [bldgStatus, setBldgStatus] = useState("active");

    // --- Subform States (Add Floor) ---
    const [selectedBldgKey, setSelectedBldgKey] = useState(""); // Can be real ID or tempId
    const [floorName, setFloorName] = useState("");
    const [floorNumFlats, setFloorNumFlats] = useState("");
    const [floorStatus, setFloorStatus] = useState("active");

    const [saving, setSaving] = useState(false);

    // Load societies
    const fetchSocietiesList = async () => {
        if (!canRead) return;
        setLoading(true);
        try {
            const res = await getSocieties();
            if (res.data && res.data.success) {
                setSocieties(res.data.data || []);
            }
        } catch (err) {
            console.error("Fetch Societies Error:", err);
            toast.error("Failed to load societies.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!permissionLoading) {
            fetchSocietiesList();
        }
    }, [permissionLoading, canRead]);

    // Handle Image File Selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image file size should not exceed 5MB.");
                return;
            }
            setImageFile(file);
            setRemoveImage(false);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove Selected or Existing Image
    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setExistingImageUrl(null);
        setRemoveImage(true);
    };

    // Add building to dynamic list
    const handleAddBuilding = () => {
        if (!bldgName.trim()) {
            toast.error("Please enter Building/Tower name.");
            return;
        }
        if (!bldgCode.trim()) {
            toast.error("Please enter Building Code.");
            return;
        }

        // Check duplicate code in local buildings
        const hasDuplicate = buildings.some(
            b => b.code.toLowerCase() === bldgCode.trim().toLowerCase()
        );
        if (hasDuplicate) {
            toast.error("Building Code must be unique.");
            return;
        }

        const newBuilding = {
            tempId: "temp_" + Date.now() + Math.floor(Math.random() * 1000),
            name: bldgName.trim(),
            code: bldgCode.trim(),
            total_floors: parseInt(bldgFloors) || 0,
            status: bldgStatus
        };

        setBuildings([...buildings, newBuilding]);
        setBldgName("");
        setBldgCode("");
        setBldgFloors("");
        setBldgStatus("active");
        toast.success(`Building '${newBuilding.name}' added to list.`);
    };

    // Remove building from list (along with cascade floors)
    const handleRemoveBuilding = (buildingToRemove) => {
        const key = buildingToRemove.id || buildingToRemove.tempId;
        
        // Remove building
        setBuildings(buildings.filter(b => (b.id || b.tempId) !== key));

        // Remove associated floors
        setFloors(floors.filter(f => {
            if (buildingToRemove.id && f.buildingId === buildingToRemove.id) return false;
            if (buildingToRemove.tempId && f.buildingTempId === buildingToRemove.tempId) return false;
            return true;
        }));

        toast.success(`Building and its floors removed.`);
    };

    // Add floor to list
    const handleAddFloor = () => {
        if (!selectedBldgKey) {
            toast.error("Please select a building.");
            return;
        }
        if (!floorName.trim()) {
            toast.error("Please enter Floor Name/Number.");
            return;
        }

        // Find the referenced building name
        const buildingObj = buildings.find(b => (b.id?.toString() === selectedBldgKey) || (b.tempId === selectedBldgKey));
        if (!buildingObj) {
            toast.error("Referenced building not found.");
            return;
        }

        const isTempBldg = selectedBldgKey.startsWith?.("temp_");

        const newFloor = {
            tempId: "temp_floor_" + Date.now() + Math.floor(Math.random() * 1000),
            buildingId: isTempBldg ? null : parseInt(selectedBldgKey),
            buildingTempId: isTempBldg ? selectedBldgKey : null,
            buildingName: buildingObj.name,
            name: floorName.trim(),
            num_flats: parseInt(floorNumFlats) || 0,
            status: floorStatus
        };

        setFloors([...floors, newFloor]);
        setFloorName("");
        setFloorNumFlats("");
        setFloorStatus("active");
        toast.success(`Floor '${newFloor.name}' added to list.`);
    };

    // Remove floor from list
    const handleRemoveFloor = (tempId) => {
        setFloors(floors.filter(f => f.tempId !== tempId));
        toast.success("Floor removed.");
    };

    // Switch back to list view and reset form
    const resetForm = () => {
        setSocietyName("");
        setSocietyCode("");
        setRegNumber("");
        setSocietyStatus("active");
        setStreetAddress("");
        setCity("");
        setState("");
        setPincode("");
        setOfficeContact("");
        setAdminEmail("");
        setSecurityContact("");
        setSocietyType("both");
        
        setImageFile(null);
        setImagePreview(null);
        setExistingImageUrl(null);
        setRemoveImage(false);

        setBuildings([]);
        setFloors([]);

        setBldgName("");
        setBldgCode("");
        setBldgFloors("");
        setBldgStatus("active");

        setSelectedBldgKey("");
        setFloorName("");
        setFloorNumFlats("");
        setFloorStatus("active");

        setFormMode("list");
        setSelectedId(null);
    };

    // Populate form for Editing
    const handleEditClick = async (societyId) => {
        setLoading(true);
        try {
            const res = await getSocietyById(societyId);
            if (res.data && res.data.success) {
                const s = res.data.data;
                setSocietyName(s.society_name || "");
                setSocietyCode(s.society_code || "");
                setRegNumber(s.registration_number || "");
                setSocietyStatus(s.society_status || "active");
                setStreetAddress(s.street_address || "");
                setCity(s.city || "");
                setState(s.state || "");
                setPincode(s.pincode || "");
                setOfficeContact(s.office_contact || "");
                setAdminEmail(s.admin_email || "");
                setSecurityContact(s.security_emergency_contact || "");
                setSocietyType(s.type || "both");
                
                setExistingImageUrl(s.society_image_url);
                setRemoveImage(false);

                // Map DB building ID to buildingName dynamically for display in floors list
                const dbBuildings = s.buildings || [];
                const dbFloors = s.floors || [];

                setBuildings(dbBuildings);
                
                // Map floor data back with temporary IDs for easy frontend removal and map building name
                setFloors(dbFloors.map(f => {
                    const b = dbBuildings.find(bld => bld.id === f.building_id);
                    return {
                        ...f,
                        tempId: "db_floor_" + f.id,
                        buildingId: f.building_id,
                        buildingName: b ? b.name : "Unknown Building"
                    };
                }));

                setSelectedId(societyId);
                setFormMode("edit");
            }
        } catch (err) {
            console.error("Load Society Info Error:", err);
            toast.error("Failed to load society details.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Delete click
    const handleDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this society? All associated buildings and floors will be permanently deleted.")) {
            return;
        }
        setLoading(true);
        try {
            const res = await deleteSociety(id);
            if (res.data && res.data.success) {
                toast.success("Society deleted successfully.");
                fetchSocietiesList();
            }
        } catch (err) {
            console.error("Delete Society Error:", err);
            toast.error(err?.response?.data?.message || "Failed to delete society.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!societyName.trim()) {
            toast.error("Society Name is required.");
            return;
        }
        if (!societyCode.trim()) {
            toast.error("Society Code is required.");
            return;
        }

        // Email validation if email is entered
        if (adminEmail.trim() && !/\S+@\S+\.\S+/.test(adminEmail)) {
            toast.error("Please enter a valid Admin Email address.");
            return;
        }

        setSaving(true);

        try {
            const formData = new FormData();
            formData.append("society_name", societyName.trim());
            formData.append("society_code", societyCode.trim());
            formData.append("registration_number", regNumber.trim());
            formData.append("society_status", societyStatus);
            formData.append("street_address", streetAddress.trim());
            formData.append("city", city.trim());
            formData.append("state", state.trim());
            formData.append("pincode", pincode.trim());
            formData.append("office_contact", officeContact.trim());
            formData.append("admin_email", adminEmail.trim());
            formData.append("security_emergency_contact", securityContact.trim());
            formData.append("type", societyType);
            formData.append("removeImage", removeImage ? "true" : "false");

            if (imageFile) {
                formData.append("image", imageFile);
            }

            // Append child records as JSON strings
            formData.append("buildings", JSON.stringify(buildings));
            formData.append("floors", JSON.stringify(floors));

            let response;
            if (formMode === "create") {
                response = await createSociety(formData);
            } else {
                response = await updateSociety(selectedId, formData);
            }

            if (response.data && response.data.success) {
                toast.success(response.data.message || "Society saved successfully.");
                resetForm();
                fetchSocietiesList();
            }
        } catch (err) {
            console.error("Save Society Error:", err);
            toast.error(err?.response?.data?.message || "An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    // DataTable columns
    const columns = useMemo(() => {
        const cols = [
            {
                key: "society_image",
                label: "Image",
                sortable: false,
                minWidth: "80px",
                render: (row) => (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-inner">
                        {row.society_image_url ? (
                            <img src={row.society_image_url} alt={row.society_name} className="h-full w-full object-cover" />
                        ) : (
                            <i className="fa-solid fa-building text-slate-400 text-lg"></i>
                        )}
                    </div>
                )
            },
            {
                key: "society_name",
                label: "Society Details",
                minWidth: "220px",
                render: (row) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-base">{row.society_name}</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5" title="Society Code">{row.society_code}</span>
                            {row.registration_number && (
                                <span className="text-xs text-slate-500 font-medium">Reg: {row.registration_number}</span>
                            )}
                        </div>
                    </div>
                )
            },
            {
                key: "type",
                label: "Type",
                minWidth: "100px",
                render: (row) => (
                    <span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
                        {row.type === 'both' ? 'Flat & Bungalow' : row.type}
                    </span>
                )
            },
            {
                key: "society_status",
                label: "Status",
                minWidth: "120px",
                render: (row) => {
                    const status = row.society_status;
                    if (status === "active") {
                        return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                        );
                    } else if (status === "inactive") {
                        return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Inactive
                            </span>
                        );
                    } else {
                        return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Maintenance
                            </span>
                        );
                    }
                }
            },
            {
                key: "counts",
                label: "Capacity",
                sortable: false,
                minWidth: "130px",
                render: (row) => {
                    if (row.type === 'bungalow') {
                        return <span className="text-xs text-slate-400 font-medium">Bungalows only</span>;
                    }
                    return (
                        <div className="flex flex-col text-xs font-semibold text-slate-600 gap-1">
                            <span>Towers/Bldgs: <span className="text-slate-900 font-bold bg-slate-100 rounded px-1.5 py-0.5">{row.building_count}</span></span>
                            <span>Total Floors: <span className="text-slate-900 font-bold bg-slate-100 rounded px-1.5 py-0.5">{row.floor_count}</span></span>
                        </div>
                    );
                }
            },
            {
                key: "contacts",
                label: "Emergency & Admin Contacts",
                sortable: false,
                minWidth: "220px",
                render: (row) => (
                    <div className="flex flex-col text-xs text-slate-600 gap-1">
                        {row.admin_email && (
                            <span className="truncate max-w-[200px]" title={row.admin_email}>
                                <i className="fa-solid fa-envelope text-slate-400 mr-1.5"></i>{row.admin_email}
                            </span>
                        )}
                        {row.office_contact && (
                            <span>
                                <i className="fa-solid fa-phone text-slate-400 mr-1.5"></i>{row.office_contact}
                            </span>
                        )}
                        {row.security_emergency_contact && (
                            <span className="text-rose-600 font-medium">
                                <i className="fa-solid fa-triangle-exclamation text-rose-400 mr-1"></i>Sec: {row.security_emergency_contact}
                            </span>
                        )}
                    </div>
                )
            }
        ];

        if (canUpdate || canDelete) {
            cols.push({
                key: "actions",
                label: "Actions",
                sortable: false,
                minWidth: "120px",
                render: (row) => (
                    <div className="flex items-center gap-2">
                        {canUpdate && (
                            <button
                                onClick={() => handleEditClick(row.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-blue-50 text-blue-900 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
                                title="Edit Society"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                                </svg>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => handleDeleteClick(row.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer"
                                title="Delete Society"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                                </svg>
                            </button>
                        )}
                    </div>
                )
            });
        }

        return cols;
    }, [canUpdate, canDelete]);

    if (!canRead && !permissionLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
                <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-lg">
                    <i className="fa-solid fa-lock text-slate-300 text-5xl mb-4"></i>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-500 text-sm">You do not have permission to view the Society Module. Please contact your system administrator.</p>
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
                        <i className="fa-solid fa-building text-blue-900"></i> Society Module
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {formMode === "list" 
                            ? "View, filter, and manage society profiles, structures, and buildings." 
                            : formMode === "create" 
                            ? "Register a new society profile and map towers, buildings, and floors." 
                            : "Update existing society profile registration, location, and structural mappings."
                        }
                    </p>
                </div>

                {formMode !== "list" && (
                    <button
                        onClick={resetForm}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back to Societies
                    </button>
                )}
            </header>

            <main className="w-full flex-1 flex flex-col p-6">
                
                {/* FORM VIEW (Add or Edit) */}
                {formMode !== "list" && (
                    <div className="w-full">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* SECTION 1: Basic details */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Basic Information & Status
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {/* Image Uploader */}
                                    <div className="md:col-span-1 flex flex-col items-center justify-center border-r border-slate-100 pr-0 md:pr-6">
                                        <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
                                            Society Image
                                        </label>
                                        <div className="relative group w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-100/50 transition-all">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : existingImageUrl ? (
                                                <img src={existingImageUrl} alt="Existing" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-2">
                                                    <i className="fa-solid fa-cloud-arrow-up text-slate-400 text-2xl mb-1 group-hover:scale-110 transition-transform"></i>
                                                    <span className="block text-[10px] text-slate-500 font-bold">Upload image</span>
                                                </div>
                                            )}
                                            
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            />
                                        </div>

                                        {(imagePreview || existingImageUrl) && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="mt-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-lg hover:bg-rose-100 transition-colors"
                                            >
                                                Remove Image
                                            </button>
                                        )}
                                    </div>

                                    {/* Standard Inputs */}
                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Society Name <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Green Meadows Residency"
                                                value={societyName}
                                                onChange={(e) => setSocietyName(e.target.value)}
                                                required
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Society Code <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. GMR01"
                                                value={societyCode}
                                                onChange={(e) => setSocietyCode(e.target.value)}
                                                required
                                                disabled={formMode === "edit"}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Registration Number
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. REG-12345/2026"
                                                value={regNumber}
                                                onChange={(e) => setRegNumber(e.target.value)}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                                Society Status
                                            </label>
                                            <select
                                                value={societyStatus}
                                                onChange={(e) => setSocietyStatus(e.target.value)}
                                                className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="maintenance">Maintenance</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Address and Location */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Address & Location Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Street Address
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Flat Road, Sector 15"
                                            value={streetAddress}
                                            onChange={(e) => setStreetAddress(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Mumbai"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            State
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Maharashtra"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 400001"
                                            value={pincode}
                                            onChange={(e) => setPincode(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: Contact details */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Contact & Emergency Desk
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Office Contact
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +91 22 2345 6789"
                                            value={officeContact}
                                            onChange={(e) => setOfficeContact(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Admin Email
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="e.g. info@greenmeadows.com"
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Security Emergency Contact
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +91 99999 88888"
                                            value={securityContact}
                                            onChange={(e) => setSecurityContact(e.target.value)}
                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 text-rose-600 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: Building & Floor Configuration */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    Structure Configuration
                                </h3>

                                <div className="mb-6 max-w-md">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                        Type of Accommodation
                                    </label>
                                    <select
                                        value={societyType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'bungalow' && (buildings.length > 0 || floors.length > 0)) {
                                                if (!window.confirm("Changing to Bungalow will clear all buildings and floors you configured. Continue?")) {
                                                    return;
                                                }
                                                setBuildings([]);
                                                setFloors([]);
                                            }
                                            setSocietyType(val);
                                        }}
                                        className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                    >
                                        <option value="both">Both Flat & Bungalows</option>
                                        <option value="flat">Flats only (Building/Towers)</option>
                                        <option value="bungalow">Bungalows only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dynamic Sub-form Sections for flats/both */}
                            {(societyType === "flat" || societyType === "both") && (
                                <div className="flex flex-col gap-6">
                                        
                                        {/* A. Buildings List and Form */}
                                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                                                <i className="fa-solid fa-towers-cell text-indigo-500"></i> Buildings / Towers
                                            </h3>

                                            {/* Add Building Form */}
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-4 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Bldg/Tower Name</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Tower A"
                                                            value={bldgName}
                                                            onChange={(e) => setBldgName(e.target.value)}
                                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Building Code</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. T-A"
                                                            value={bldgCode}
                                                            onChange={(e) => setBldgCode(e.target.value)}
                                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600 font-mono"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Total Floors</label>
                                                        <input
                                                            type="number"
                                                            placeholder="e.g. 10"
                                                            value={bldgFloors}
                                                            onChange={(e) => setBldgFloors(e.target.value)}
                                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
                                                        <select
                                                            value={bldgStatus}
                                                            onChange={(e) => setBldgStatus(e.target.value)}
                                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleAddBuilding}
                                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-plus text-[11px]"></i> Add Building
                                                </button>
                                            </div>

                                            {/* Buildings List view */}
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {buildings.length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic text-center py-4">No buildings added yet.</p>
                                                ) : (
                                                    buildings.map((b, idx) => (
                                                        <div key={b.id || b.tempId} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                                                            <div>
                                                                <span className="font-bold text-slate-800 text-sm">{b.name}</span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="font-mono text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{b.code}</span>
                                                                    <span className="text-xs text-slate-400 font-medium">Floors: {b.total_floors}</span>
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                                        b.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                                    }`}>{b.status}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBuilding(b)}
                                                                className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Delete Building and associated Floors"
                                                            >
                                                                <i className="fa-solid fa-trash-can text-sm"></i>
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* B. Floors List and Form */}
                                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                                                Floor Specifications
                                            </h3>

                                            {/* Add Floor Form */}
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-4 space-y-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Select Building</label>
                                                    <select
                                                        value={selectedBldgKey}
                                                        onChange={(e) => setSelectedBldgKey(e.target.value)}
                                                        className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                                    >
                                                        <option value="">-- Choose Building --</option>
                                                        {buildings.map(b => (
                                                            <option key={b.id || b.tempId} value={b.id || b.tempId}>
                                                                {b.name} ({b.code})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Floor Name/Number</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. 1st Floor, P-1"
                                                            value={floorName}
                                                            onChange={(e) => setFloorName(e.target.value)}
                                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Number of Flats</label>
                                                        <input
                                                            type="number"
                                                            placeholder="e.g. 4"
                                                            value={floorNumFlats}
                                                            onChange={(e) => setFloorNumFlats(e.target.value)}
                                                            className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 focus:border-indigo-600"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
                                                    <select
                                                        value={floorStatus}
                                                        onChange={(e) => setFloorStatus(e.target.value)}
                                                        className="w-full box-border border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm outline-none text-slate-800 bg-white focus:border-indigo-600"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleAddFloor}
                                                    className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-bold transition-all shadow shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-plus text-[11px]"></i> Add Floor
                                                </button>
                                            </div>

                                            {/* Floors List view */}
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {floors.length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic text-center py-4">No floors added yet.</p>
                                                ) : (
                                                    floors.map((f) => (
                                                        <div key={f.tempId} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                                                            <div>
                                                                <span className="font-bold text-slate-800 text-sm">
                                                                    {f.buildingName} - {f.name}
                                                                </span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-xs text-slate-400 font-medium">Flats: {f.num_flats}</span>
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                                        f.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                                    }`}>{f.status}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFloor(f.tempId)}
                                                                className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Delete Floor"
                                                            >
                                                                <i className="fa-solid fa-trash-can text-sm"></i>
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                </div>
                            )}

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
                                    {saving ? "Saving..." : formMode === "create" ? "Create Society" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* LIST VIEW */}
                {formMode === "list" && (
                    <div className="w-full flex-1 flex flex-col">
                        <DataTable
                            tableId="society_module_list"
                            title="Societies List"
                            data={societies}
                            columns={columns}
                            loading={loading}
                            searchPlaceholder="Search societies by name, code, city..."
                            actionButton={
                                canWrite ? (
                                    <button
                                        onClick={() => setFormMode("create")}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md hover:shadow-lg shadow-indigo-100 transition-all cursor-pointer hover:scale-105"
                                        title="Add New Society"
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
