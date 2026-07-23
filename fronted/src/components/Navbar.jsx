import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/navbar.css";

function Navbar() {
    const [menuAbierto, setMenuAbierto] = useState(false);

    const toggleMenu = () => {
        setMenuAbierto((abierto) => !abierto);
    };

    const cerrarMenu = () => {
        setMenuAbierto(false);
    };

    return (

        <nav className="navbar">

            <div className="navbar-top-row">
                <h2>Tinta Retirada</h2>
                <button
                    type="button"
                    className={`hamburger-button ${menuAbierto ? "activo" : ""}`}
                    onClick={toggleMenu}
                    aria-label="Abrir o cerrar menú"
                    aria-expanded={menuAbierto}
                    aria-controls="menu-principal"
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            <ul id="menu-principal" className={`navbar-links ${menuAbierto ? "abierto" : ""}`}>

                <li><Link to="/" onClick={cerrarMenu}>Inicio</Link></li>

                <li><Link to="/catalogo" onClick={cerrarMenu}>Catálogo</Link></li>

                <li><Link to="/login" onClick={cerrarMenu}>Login</Link></li>

                <li><Link to="/registro" onClick={cerrarMenu}>Registro</Link></li>

                <li><Link to="/carrito" onClick={cerrarMenu}>Carrito</Link></li>

            </ul>

        </nav>

    );

}

export default Navbar;