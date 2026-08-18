import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function MainLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Sidebar component */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            {/* Main view container on the right */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? "md:pl-20" : "md:pl-64"}`}>
                {/* Mobile top bar */}
                <header className="md:hidden flex items-center justify-between px-6 h-16 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-sm">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white focus:outline-none"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
                        MYVMS
                    </span>
                    <div className="w-8"></div> {/* Spacer for symmetry */}
                </header>

                {/* Page content view */}
                <main className="flex-1 flex flex-col relative">
                    <Outlet />
                </main>

                {/* Footer at the bottom of main view */}
                <Footer />
            </div>
        </div>
    );
}
