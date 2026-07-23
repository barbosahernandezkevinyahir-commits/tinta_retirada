import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./styles/App.css";

import Inicio from "./pages/Inicio";
import Catalogo from "./pages/Catalogo";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Carrito from "./pages/Carrito";
import Favoritos from "./pages/Favoritos";
import Historial from "./pages/Historial";
import Recuperar from "./pages/Recuperar";
import Restablecer from "./pages/Restablecer";
import DetalleProducto from "./pages/DetalleProducto";
import Dashboard from "./admin/Dashboard";
import Productos from "./admin/Productos";
import AgregarProducto from "./admin/AgregarProducto";
import EditarProducto from "./admin/Editarproducto";
import Estadisticas from "./admin/Estadisticas";
import Clientes from "./admin/Clientes";
import Pedidos from "./admin/Pedidos";

function AppRoutes() {
    const location = useLocation();

    return (
        <div key={location.pathname} className="route-transition">
            <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/catalogo" element={<Catalogo />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/recuperar" element={<Recuperar />} />
                <Route path="/recuperar/:token" element={<Restablecer />} />
                <Route path="/producto/:id" element={<DetalleProducto />} />
                <Route path="/carrito" element={<Carrito />} />
                <Route path="/favoritos" element={<Favoritos />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/productos" element={<Productos />} />
                <Route path="/admin/agregar" element={<AgregarProducto />} />
                <Route path="/admin/editar/:id" element={<EditarProducto />} />
                <Route path="/admin/estadisticas" element={<Estadisticas />} />
                <Route path="/admin/clientes" element={<Clientes />} />
                <Route path="/admin/pedidos" element={<Pedidos />} />
            </Routes>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

export default App;