import { useState, useEffect } from "react";
import { createUserByAdmin } from "../../../api/authApi";
import { getUserTypes } from "../../../api/userTypeModulesApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateUser() {
    const navigate = useNavigate();
    const [userTypes, setUserTypes] = useState([]);

    const [newUserForm, setNewUserForm] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        userTypeId: "",
        mobNo: "",
        dateOfJoin: "",
        deviceVerificationRequired: true,
        role: "user"
    });
    const [creatingUser, setCreatingUser] = useState(false);

    const loadUserTypes = async () => {
        try {
            const res = await getUserTypes();
            setUserTypes(res.data.data || []);
        } catch (error) {
            console.error("Error loading user types:", error);
            toast.error("Failed to load user type options.");
        }
    };

    useEffect(() => {
        loadUserTypes();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreatingUser(true);
        try {
            await createUserByAdmin(newUserForm);
            toast.success("User created successfully");
            setNewUserForm({
                name: "",
                username: "",
                email: "",
                password: "",
                userTypeId: "",
                mobNo: "",
                dateOfJoin: "",
                deviceVerificationRequired: true,
                role: "user"
            });
            setTimeout(() => {
                navigate("/admin/dashboard");
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create user");
        } finally {
            setCreatingUser(false);
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col min-h-screen bg-slate-50/50">
            {/* TOP BAR / NAVIGATION HEADER */}
            <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-user-plus text-blue-900"></i> Create New User
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Register and configure a new system user profile.
                    </p>
                </div>

                <button
                    onClick={() => navigate("/admin/dashboard")}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                >
                    <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
                </button>
            </header>

            <main className="w-full max-w-4xl mx-auto flex-1 flex flex-col p-6">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <form onSubmit={handleCreateUser} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserForm.name}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter Full Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserForm.username}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter Username"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserForm.email}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter Email Address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newUserForm.password}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter Password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">User Type</label>
                                <select
                                    value={newUserForm.userTypeId}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, userTypeId: e.target.value })}
                                    className="block w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select user type</option>
                                    {userTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.type_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">User Group (Role)</label>
                                <select
                                    value={newUserForm.role}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                                    className="block w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={newUserForm.mobNo}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, mobNo: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter mobile number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Join</label>
                                <input
                                    type="date"
                                    value={newUserForm.dateOfJoin}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, dateOfJoin: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                             <input
                                id="deviceVerification"
                                type="checkbox"
                                checked={newUserForm.deviceVerificationRequired}
                                onChange={(e) => setNewUserForm({ ...newUserForm, deviceVerificationRequired: e.target.checked })}
                                className="h-4 w-4 text-[#1e3a8a] border-slate-300 rounded focus:ring-[#1e3a8a]"
                            />
                            <label htmlFor="deviceVerification" className="text-sm font-medium text-slate-700">
                                Require device verification for this user
                            </label>
                        </div>
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={creatingUser}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#1e3a8a] hover:bg-[#172554] focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] disabled:opacity-50 transition-colors"
                            >
                                {creatingUser ? "Creating..." : "Create User Account"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

