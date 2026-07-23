import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {

    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [mensaje, setMensaje] = useState("");
    const navigate = useNavigate();

    const iniciarSesion = async () => {
        if (!correo || !password) {
            setMensaje("Complete correo y contraseña.");
            return;
        }

        try {
            const respuesta = await api.post("/auth/login", {
                correo,
                password
            });

            localStorage.setItem("token", respuesta.data.token);
            localStorage.setItem("usuario", JSON.stringify(respuesta.data.usuario));

            if (respuesta.data.usuario?.rol === "admin") {
                navigate("/admin");
            } else {
                navigate("/catalogo");
            }

        } catch {
            setMensaje("Credenciales incorrectas. Pruebe: admin / 1234567890");
        }
    };

    return (
        <section className="auth-page auth-login-page">
            <div className="auth-layout">
            <aside className="auth-hero auth-hero-login">
                    <p className="auth-overline">Bienvenido</p>
                    <h2>Accede a tu cuenta</h2>
                    <p>Gestiona carrito, pedidos y favoritos desde cualquier dispositivo.</p>
                </aside>

                <div className="form-container auth-form">
                    <Link to="/" className="auth-back-button">Volver al inicio</Link>
                    <h1>Iniciar Sesión</h1>
                    {mensaje && <p className="form-message">{mensaje}</p>}
                    <input
                        type="text"
                        placeholder="Usuario o correo"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={iniciarSesion}>Entrar</button>
                    <p className="info-text">
                        Usuario administrador: <strong>admin</strong><br />
                        Contraseña: <strong>1234567890</strong>
                    </p>
                    <p className="link-text">
                        ¿Olvidaste tu contraseña? <Link to="/recuperar">Recupérala aquí</Link>
                    </p>
                    <p className="link-text">
                        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
                    </p>
                    <p className="link-text">
                        <Link to="/catalogo">Regresar a la tienda</Link>
                    </p>
                </div>
            </div>
        </section>
    );
}

export default Login;