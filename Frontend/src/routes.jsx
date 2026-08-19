import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import DeviceRegistration from "./pages/DeviceRegistration";
import PendingApproval from "./pages/PendingApproval";

import UserHome from "./pages/user/UserHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserGroupModules from "./pages/admin/user/UserGroupModules";
import CreateUser from "./pages/admin/user/CreateUser";
import CreateUserType from "./pages/admin/user/CreateUserType";
import ActivityReport from "./pages/admin/ActivityReport";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import GuestLayout from "./components/GuestLayout";
import SocietyModule from "./pages/admin/SocietyModule";
import UnitModule from "./pages/admin/UnitModule";
import GateModule from "./pages/admin/GateModule";
import GuardModule from "./pages/admin/GuardModule";

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={<Login />}
            />

            {/* Guest pages wrapping */}
            <Route element={<GuestLayout />}>
                <Route
                    path="/device-registration"
                    element={<DeviceRegistration />}
                />
                <Route
                    path="/pending-approval"
                    element={<PendingApproval />}
                />
            </Route>

            {/* Protected Routes wrapping */}
            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/user/home"
                        element={<UserHome />}
                    />
                    <Route
                        path="/profile"
                        element={<Profile />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModules={["user_master", "device_approval"]} requiredAction="read" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/dashboard"
                        element={<AdminDashboard />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="activity_report" requiredAction="read" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/report"
                        element={<ActivityReport />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="user_master" requiredAction="write" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/users/create"
                        element={<CreateUser />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="user_type" requiredAction="read" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/user-types"
                        element={<UserGroupModules />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="user_type" requiredAction="write" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/user-types/create"
                        element={<CreateUserType />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="society_master" requiredAction="read" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/societies"
                        element={<SocietyModule />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="unit_module" requiredAction="read" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/units"
                        element={<UnitModule />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="gate_master" requiredAction="read" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/gates"
                        element={<GateModule />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredModule="guard_master" requiredAction="read" />}>
                <Route element={<MainLayout />}>
                    <Route
                        path="/admin/guards"
                        element={<GuardModule />}
                    />
                </Route>
            </Route>
        </Routes>
    );
}