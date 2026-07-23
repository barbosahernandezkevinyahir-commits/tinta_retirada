import { Link, NavLink } from "react-router-dom";
import "../styles/admin.css";

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-badge">TR</div>
                <div className="brand-text">
                    <h2>Tinta Retirada</h2>
                    <p>Panel administrativo</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/admin" end className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                    🏠 Dashboard
                </NavLink>
                <NavLink to="/admin/productos" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                    📦 Productos
                </NavLink>
                <NavLink to="/admin/agregar" className={({ isActive }) => `sidebar-link sidebar-cta ${isActive ? "is-active" : ""}`}>
                    ➕ Agregar producto
                </NavLink>
                <NavLink to="/admin/clientes" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                    👥 Clientes
                </NavLink>
                <NavLink to="/admin/pedidos" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                    📋 Pedidos
                </NavLink>
                <NavLink to="/admin/estadisticas" className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}>
                    📊 Estadísticas
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <Link to="/">🛍️ Volver a la tienda</Link>
            </div>
        </aside>
    );
}

export default Sidebar;