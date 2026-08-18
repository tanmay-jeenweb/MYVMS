import { Navigate, Outlet } from "react-router-dom";
import { usePermission } from "../context/PermissionContext";

export default function ProtectedRoute({ allowedRole, allowedModule, requiredModule, requiredModules, requiredAction = "read" }) {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const { hasPermission, loading } = usePermission();

    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-semibold">Verifying permissions...</p>
                </div>
            </div>
        );
    }

    // Role check (admin or specific module permission)
    if (allowedRole && user.role !== allowedRole && !(allowedRole === "admin" && user.role === "super admin")) {
        const isAllowedByModule = (requiredModule && hasPermission(requiredModule, requiredAction)) ||
                                  (requiredModules && requiredModules.some(m => hasPermission(m, requiredAction)));
        if (!isAllowedByModule) {
            return <Navigate to="/user/home" replace />;
        }
    }

    // Module permission check
    if (requiredModule && !hasPermission(requiredModule, requiredAction)) {
        return <Navigate to="/user/home" replace />;
    }
    if (requiredModules && !requiredModules.some(m => hasPermission(m, requiredAction))) {
        return <Navigate to="/user/home" replace />;
    }

    // Module check
    if (allowedModule) {
        // Admin has access to everything
        if (user.role !== "admin" && user.role !== "super admin") {
            const hasModule = user.modules && user.modules.includes(allowedModule);
            if (!hasModule) {
                return <Navigate to="/user/home" replace />;
            }
        }
    }

    return <Outlet />;
}
