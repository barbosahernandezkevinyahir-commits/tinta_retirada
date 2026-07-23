import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Recuperar() {
    const [correo, setCorreo] = useState("");
    const [mensaje, setMensaje] = useState("");

    const enviarRecuperacion = async () => {
        if (!correo) {
            setMensaje("Ingresa tu correo para recibir el enlace.");
            return;
        }

        try {
            await api.post("/auth/recuperar", { correo });
            setMensaje("Correo de recuperación enviado. Revisa tu bandeja.");
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo enviar el correo. Verifica tu correo e intenta de nuevo.");
        }
    };

    return (
        <section className="auth-page auth-recover-page">
            <div className="auth-layout">
                <aside className="auth-hero auth-hero-recover">
                    <p className="auth-overline">Recuperación</p>
                    <h2>Recupera el acceso</h2>
                    <p>Te enviaremos un enlace seguro para restablecer tu contraseña.</p>
                </aside>

                <div className="form-container auth-form">
                    <Link to="/login" className="auth-back-button">Volver al inicio de sesión</Link>
                    <h1>Recuperar contraseña</h1>
                    {mensaje && <p className="form-message">{mensaje}</p>}
                    <input
                        type="email"
                        placeholder="Correo"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                    />
                    <button onClick={enviarRecuperacion}>Enviar enlace</button>
                </div>
            </div>
        </section>
    );
}

export default Recuperar;
