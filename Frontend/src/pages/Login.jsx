import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loginUser } from "../api/authApi";
import { getDeviceId } from "../utils/device";
import jwlogo from "../assets/jwLogo.jpeg";
import heroImage from "../assets/ChatGPT Image Aug 18, 2026, 12_27_06 PM.png";


export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const deviceId = await getDeviceId();
            const response = await loginUser({ ...form, deviceId });

            if (!response.data.success) {
                if (response.data.status === "DEVICE_REGISTRATION_REQUIRED") {
                    navigate("/device-registration", { state: { username: form.username, password: form.password } });
                    return;
                }
                if (response.data.status === "PENDING_APPROVAL") {
                    navigate("/pending-approval");
                    return;
                }
                toast.error(response.data.message || "Login failed");
                return;
            }

            const user = response.data.user;
            const token = response.data.token;
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token", token);
            sessionStorage.setItem("loginTime", new Date().toLocaleTimeString());
            window.dispatchEvent(new Event("auth-change"));
            navigate("/user/home");

        } catch (error) {
            if (error.response?.data?.status === "DEVICE_MISMATCH") {
                toast.error("Unauthorized device. Contact admin.");
            } else {
                toast.error(error.response?.data?.message || "Login failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col md:flex-row bg-[#f8fafc] font-sans antialiased overflow-hidden relative">

            {/* Left Column: Balanced Hero Image Card */}
            <div className="hidden md:flex md:w-3/5 h-full relative overflow-hidden select-none z-10 border-r border-slate-200 bg-[#f8fafc] p-3 justify-center items-center">
                <img
                    src={heroImage}
                    alt="VMS Security Platform"
                    className="w-full h-auto rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.05)] border border-slate-100 object-contain"
                />
            </div>

            {/* Right Column: Clean Light Form (Matches Screenshot) */}
            <div className="w-full md:w-2/5 h-full flex flex-col justify-between p-4 sm:py-8 sm:px-10 relative bg-[#f8fafc] overflow-y-auto z-10 text-slate-900">

                <div className="w-full max-w-md mx-auto py-2 flex flex-col items-center">
                    
                    {/* Blue Building circular icon logo wrapper */}
                    <div className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] mb-4 shrink-0">
                        <svg className="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 2H9c-1.1 0-2 .9-2 2v3H3c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM5 20H3V9h2v11zm4 0H7V9h2v11zm12 0h-10v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2V4h10v16zm-2-14h-6v2h6V6zm0 4h-6v2h6v-2zm0 4h-6v2h6v-2z" />
                        </svg>
                    </div>

                    {/* Headings */}
                    <div className="text-center mb-5">
                        <h2 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
                            Welcome Back
                        </h2>
                        <p className="text-slate-500 text-sm mt-1.5">
                            Sign in to your administration dashboard.
                        </p>
                    </div>

                    {/* Premium Light Form Card */}
                    <div className="bg-white border border-slate-200/85 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] w-full transition-all duration-300">
                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* Username Input */}
                            <div className="space-y-2">
                                <label htmlFor="username" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Username
                                </label>
                                <div className="relative group">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5.5 h-5.5">
                                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        placeholder="Enter your username"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-slate-800 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/25"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => toast.error("Contact your administrator to reset credentials.")}
                                        className="text-[11px] text-blue-600 hover:text-blue-500 font-bold focus:outline-none cursor-pointer"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5.5 h-5.5">
                                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="Enter your password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-slate-800 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/25"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                                        tabIndex={-1}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            {showPassword ? (
                                                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                                            ) : (
                                                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                            )}
                                            {!showPassword && (
                                                <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Sign In Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-3 rounded-xl text-white text-sm font-bold tracking-wider transition-all duration-300 bg-blue-600 hover:bg-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.35)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-75 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 6.75 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer section inside content container */}
                <div className="z-10 mt-auto w-full max-w-md mx-auto pt-4 border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Powered by</span>
                            <img src={jwlogo} alt="Jeenweb" className="h-10 w-auto rounded-sm cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open("https://www.jeenweb.com", "_blank")} />
                        </div>
                        <div className="text-center sm:text-right flex flex-col gap-0.5 text-slate-400">
                            <span>Helpline: <a href="tel:9824466017" className="font-semibold text-slate-500 hover:text-blue-600 transition-colors">9824466017</a></span>
                            <span>Email: <a href="mailto:info@jeenweb.com" className="font-semibold text-slate-500 hover:text-blue-600 transition-colors">info@jeenweb.com</a></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}