import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/App.css";
import Dashboard from "./admin/Dashboard";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;