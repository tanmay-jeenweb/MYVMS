import AppRoutes from "./routes";

function App() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative">
            <div className="flex-1 flex flex-col">
                <AppRoutes />
            </div>
        </div>
    );
}

export default App;