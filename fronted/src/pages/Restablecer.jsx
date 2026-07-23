import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

function Restablecer() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [mensaje, setMensaje] = useState("");

    const cambiarPassword = async () => {
        if (!password) {
            setMensaje("Ingresa una nueva contraseña.");
            return;
        }

        try {
            await api.post("/auth/cambiar", { token, password });
            setMensaje("Contraseña actualizada correctamente.");
            setTimeout(() => navigate("/login"), 1500);
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo actualizar la contraseña. El enlace puede haber expirado.");
        }
    };

    return (
        <section className="auth-page auth-reset-page">
            <div className="auth-layout">
                <aside className="auth-hero auth-hero-reset">
                    <p className="auth-overline">Seguridad</p>
                    <h2>Restablece tu contraseña</h2>
                    <p>Crea una nueva contraseña para proteger el acceso a tu cuenta.</p>
                </aside>

                <div className="form-container auth-form">
                    <Link to="/login" className="auth-back-button">Volver al inicio de sesión</Link>
                    <h1>Restablecer contraseña</h1>
                    {mensaje && <p className="form-message">{mensaje}</p>}
                    <input
                        type="password"
                        placeholder="Nueva contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={cambiarPassword}>Guardar contraseña</button>
                </div>
            </div>
        </section>
    );
}

export default Restablecer;
