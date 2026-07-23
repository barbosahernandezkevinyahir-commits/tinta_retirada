import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Registro() {

    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [mensaje, setMensaje] = useState("");
    const navigate = useNavigate();

    const registrar = async () => {
        if (!nombre || !correo || !password) {
            setMensaje("Complete todos los campos para registrarse.");
            return;
        }

        try {
            await api.post("/auth/registro", {
                nombre,
                correo,
                password
            });

            alert("Usuario registrado correctamente. Ahora puede iniciar sesión.");
            navigate("/login");
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo registrar el usuario. Verifique los datos.");
        }
    };

    return (
        <section className="auth-page auth-register-page">
            <div className="auth-layout">
            <aside className="auth-hero auth-hero-register">
                    <p className="auth-overline">Crea tu cuenta</p>
                    <h2>Regístrate en segundos</h2>
                    <p>Empieza a comprar, guardar favoritos y revisar tus pedidos en tiempo real.</p>
                </aside>

                <div className="form-container auth-form">
                    <Link to="/" className="auth-back-button">Volver al inicio</Link>
                    <h1>Registro</h1>
                    {mensaje && <p className="form-message">{mensaje}</p>}
                    <input
                        placeholder="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="Correo"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={registrar}>Registrarse</button>
                    <p className="link-text">
                        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
                    </p>
                </div>
            </div>
        </section>
    );
}

export default Registro;