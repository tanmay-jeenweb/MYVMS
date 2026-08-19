import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../context/PermissionContext";

export default function UserHome() {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
    const isAdmin = user.role === "admin" || user.role === "super admin";

    const canManageUsers = isAdmin || hasPermission("user_master", "read");
    const canManageRoles = isAdmin || hasPermission("user_type", "read");
    const canViewReport = isAdmin || hasPermission("activity_report", "read");

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <main className="flex-1 w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Welcome Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-[#1e3a8a] to-[#0c2340] rounded-3xl p-8 sm:p-12 shadow-xl text-white mb-10 transition-all hover:shadow-2xl">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 max-w-2xl">
                        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-sky-200 border border-white/10 mb-4 backdrop-blur-sm">
                            Platform Status: Active
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                            Welcome back, {user.name || "User"}!
                        </h1>
                        <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
                            Access the MYVMS administration suite. Use the navigation menu at the top or the quick action cards below to manage accounts, configure roles, and inspect security logs.
                        </p>
                    </div>
                </div>

                {/* Quick Action Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Profile Card */}
                    <div
                        onClick={() => navigate("/profile")}
                        className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-indigo-500 transition-all duration-300" />
                        <div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-user-gear text-indigo-600 text-lg"></i>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                                Your Profile
                            </h3>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                Review your personal details, credentials, permissions, and active device details.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                            <span>Manage Profile</span>
                            <span className="text-indigo-600 font-bold group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                                View Profile
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    {/* User Modules Card */}
                    {canManageUsers && (
                        <div
                            onClick={() => navigate("/admin/dashboard")}
                            className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-teal-500 transition-all duration-300" />
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-users-gear text-emerald-600 text-lg"></i>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">
                                    User Modules
                                </h3>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                    Manage member accounts, toggle active/inactive status, approve new logins, and authorize devices.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span>Manage Users</span>
                                <span className="text-emerald-600 font-bold group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                                    Open Module
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* User Type Modules Card */}
                    {canManageRoles && (
                        <div
                            onClick={() => navigate("/admin/user-types")}
                            className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-gradient-to-r group-hover:from-violet-500 group-hover:to-purple-500 transition-all duration-300" />
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-user-shield text-violet-600 text-lg"></i>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-violet-700 transition-colors">
                                    User Types Modules
                                </h3>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                    Define administrative and worker groups, and customize read/write access permissions.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span>Manage User Groups</span>
                                <span className="text-violet-600 font-bold group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                                    Open Module
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Activity Report Card */}
                    {canViewReport && (
                        <div
                            onClick={() => navigate("/admin/report")}
                            className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-indigo-600 transition-all duration-300" />
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-list-check text-indigo-600 text-lg"></i>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                                    Activity Report
                                </h3>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                    Inspect system audit logs, tracking who modified what details and when the changes occurred.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span>Inspect Logs</span>
                                <span className="text-indigo-600 font-bold group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                                    View Report
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
