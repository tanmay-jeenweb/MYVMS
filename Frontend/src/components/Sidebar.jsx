import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { logoutUser } from "../api/authApi";
import { usePermission } from "../context/PermissionContext";

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const { hasPermission } = usePermission();
    const isAdmin = user.role === "admin" || user.role === "super admin";

    const [isModulesOpen, setIsModulesOpen] = useState(() => {
        return ["/admin/dashboard", "/admin/user-types", "/admin/societies", "/admin/units"].includes(location.pathname);
    });

    useEffect(() => {
        if (["/admin/dashboard", "/admin/user-types", "/admin/societies", "/admin/units"].includes(location.pathname)) {
            setIsModulesOpen(true);
        }
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed", error);
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        sessionStorage.removeItem("loginTime");
        window.dispatchEvent(new Event("auth-change"));
        navigate("/");
    };

    const allModules = [
        {
            name: "User Modules",
            path: "/admin/dashboard",
            moduleKeys: ["user_master", "device_approval"],
            icon: "fa-solid fa-users-gear",
            desc: "Manage user profiles & accounts"
        },
        {
            name: "User Types Modules",
            path: "/admin/user-types",
            moduleKey: "user_type",
            icon: "fa-solid fa-user-shield",
            desc: "Configure access roles"
        },
        {
            name: "Society Module",
            path: "/admin/societies",
            moduleKey: "society_master",
            icon: "fa-solid fa-building",
            desc: "Manage societies, buildings & floors"
        },
        {
            name: "Unit Module",
            path: "/admin/units",
            moduleKey: "unit_module",
            icon: "fa-solid fa-house-chimney",
            desc: "Manage residential/commercial units"
        }
    ];

    const availableModules = allModules.filter(m => {
        if (m.adminOnly) return isAdmin;
        if (m.moduleKey) return hasPermission(m.moduleKey, "read");
        if (m.moduleKeys) return m.moduleKeys.some(key => hasPermission(key, "read"));
        return true;
    });

    const hasActivityReport = isAdmin || hasPermission("activity_report", "read");

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside 
                className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out md:translate-x-0 ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                } ${isCollapsed ? "md:w-20 w-64" : "w-64"}`}
            >
                {/* Brand Header */}
                <div className={`relative flex items-center h-16 px-4 border-b border-slate-800 transition-all duration-300 ${isCollapsed ? "justify-center" : "justify-between"}`}>
                    <Link to="/user/home" className="flex items-center gap-2 select-none" onClick={onClose}>
                        {isCollapsed ? (
                            <span className="text-2xl font-black text-blue-400 transition-all duration-300">
                                M
                            </span>
                        ) : (
                            <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent transition-all duration-300">
                                MYVMS
                            </span>
                        )}
                    </Link>
                    
                    {/* Desktop Collapse Toggle floating on the border */}
                    {!isOpen && (
                        <button 
                            onClick={onToggleCollapse}
                            className="hidden md:flex absolute top-5 -right-3 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white items-center justify-center cursor-pointer shadow-md z-50 hover:bg-slate-700 hover:scale-110 transition-all duration-200 focus:outline-none"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <svg 
                                className={`w-3 h-3 transform transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Close button on mobile */}
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden focus:outline-none"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {/* Dashboard */}
                    <Link
                        to="/user/home"
                        onClick={onClose}
                        className={`flex items-center transition-all duration-200 ${
                            isActive("/user/home") 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                : "hover:bg-slate-800 hover:text-white text-slate-300"
                        } ${isCollapsed ? "justify-center w-10 h-10 rounded-xl mx-auto" : "gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"}`}
                        title={isCollapsed ? "Dashboard" : ""}
                    >
                        <i className="fa-solid fa-house text-base"></i>
                        {!isCollapsed && <span>Dashboard</span>}
                    </Link>

                    {/* Modules Dropdown */}
                    {availableModules.length > 0 && (
                        <div>
                            {isCollapsed ? (
                                <div className="border-t border-slate-800/80 my-2" />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsModulesOpen(!isModulesOpen)}
                                    className={`w-full flex items-center justify-between transition-all duration-200 hover:bg-slate-800 hover:text-white gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-transparent border-none cursor-pointer focus:outline-none`}
                                >
                                    <div className="flex items-center gap-3">
                                        <i className="fa-solid fa-cubes text-base"></i>
                                        <span>Modules</span>
                                    </div>
                                    <svg
                                        className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                                            isModulesOpen ? "rotate-90" : ""
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            )}
                            {(!isCollapsed ? isModulesOpen : true) && (
                                <div className={`space-y-1.5 ${!isCollapsed ? "ml-3.5 border-l border-slate-800/80 pl-3.5 mt-1" : ""}`}>
                                    {availableModules.map((m, idx) => (
                                        <Link
                                            key={idx}
                                            to={m.path}
                                            onClick={onClose}
                                            className={`flex items-center transition-all duration-200 ${
                                                isActive(m.path)
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                    : "hover:bg-slate-800 hover:text-white text-slate-300"
                                            } ${isCollapsed ? "justify-center w-10 h-10 rounded-xl mx-auto" : "gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"}`}
                                            title={isCollapsed ? m.name : ""}
                                        >
                                            <i className={`${m.icon} text-base`}></i>
                                            {!isCollapsed && <span>{m.name}</span>}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reports Section */}
                    {hasActivityReport && (
                        <div>
                            {isCollapsed && <div className="border-t border-slate-800/80 my-2" />}
                            <Link
                                to="/admin/report"
                                onClick={onClose}
                                className={`flex items-center transition-all duration-200 ${
                                    isActive("/admin/report")
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                        : "hover:bg-slate-800 hover:text-white text-slate-300"
                                } ${isCollapsed ? "justify-center w-10 h-10 rounded-xl mx-auto" : "gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"}`}
                                title={isCollapsed ? "Reports" : ""}
                            >
                                <i className="fa-solid fa-chart-line text-base"></i>
                                {!isCollapsed && <span>Reports</span>}
                            </Link>
                        </div>
                    )}
                </nav>

                {/* User Section at the bottom */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                    {isCollapsed ? (
                        <div className="flex flex-col items-center gap-3">
                            <Link
                                to="/profile"
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base shadow-sm shrink-0 hover:bg-slate-800 hover:text-white transition-colors duration-200"
                                title={`Profile: ${user.name || "User"}`}
                            >
                                {user.name ? user.name[0].toUpperCase() : "U"}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-colors duration-200 cursor-pointer border border-red-950/50"
                                title="Sign out"
                            >
                                <i className="fa-solid fa-right-from-bracket text-base"></i>
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                                    {user.name ? user.name[0].toUpperCase() : "U"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white truncate leading-tight">{user.name || "User"}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{user.role || "Role"}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    to="/profile"
                                    onClick={onClose}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                    title="Profile"
                                >
                                    <i className="fa-solid fa-user text-xs"></i>
                                    Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 text-xs font-bold transition-colors cursor-pointer border border-red-950"
                                    title="Sign out"
                                >
                                    <i className="fa-solid fa-right-from-bracket text-xs"></i>
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}
