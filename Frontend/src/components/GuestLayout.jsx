import { Outlet } from "react-router-dom";
import Footer from "./Footer";

export default function GuestLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <div className="flex-1 flex flex-col">
                <Outlet />
            </div>
            <Footer />
        </div>
    );
}
