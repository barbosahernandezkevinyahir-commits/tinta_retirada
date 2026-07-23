import Sidebar from "./Sidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

function Clientes() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [filasNuevas, setFilasNuevas] = useState([]);
    const idsPreviosRef = useRef(new Set());

    const cargarUsuarios = async () => {
        try {
            setMensaje("");
            const respuesta = await api.get("/auth/usuarios");
            const listaUsuarios = Array.isArray(respuesta.data) ? respuesta.data : [];
            const idsNuevos = listaUsuarios
                .filter((usuario) => !idsPreviosRef.current.has(usuario.id))
                .map((usuario) => usuario.id);

            setUsuarios(listaUsuarios);
            if (idsPreviosRef.current.size > 0 && idsNuevos.length > 0) {
                setFilasNuevas(idsNuevos);
            }

            idsPreviosRef.current = new Set(listaUsuarios.map((usuario) => usuario.id));
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo cargar la lista de clientes. Inicia sesión como admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialLoadId = setTimeout(() => {
            cargarUsuarios();
        }, 0);
        const intervalId = setInterval(cargarUsuarios, 15000);
        return () => {
            clearTimeout(initialLoadId);
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (filasNuevas.length === 0) return;

        const timeoutId = setTimeout(() => {
            setFilasNuevas([]);
        }, 1800);

        return () => clearTimeout(timeoutId);
    }, [filasNuevas]);

    const administradores = useMemo(
        () => usuarios.filter((usuario) => String(usuario.rol).toLowerCase() === "admin").length,
        [usuarios]
    );

    return (
        <div className="admin-container">
            <Sidebar />
            <main className="admin-content">
                <div className="admin-page-header">
                    <div>
                        <p className="admin-overline">Audiencia</p>
                        <h1>Clientes</h1>
                        <p className="admin-intro">Revisa el crecimiento de tu base de clientes y descubre oportunidades para fidelizarlos.</p>
                    </div>
                    <button className="button-secondary" onClick={cargarUsuarios}>Actualizar</button>
                </div>

                {mensaje && <p className="form-message">{mensaje}</p>}

                <div className="admin-grid">
                    <section className="admin-card">
                        <h3>Usuarios registrados</h3>
                        <strong>{loading ? "..." : usuarios.length}</strong>
                    </section>
                    <section className="admin-card">
                        <h3>Clientes activos</h3>
                        <strong>{loading ? "..." : Math.max(usuarios.length - administradores, 0)}</strong>
                    </section>
                    <section className="admin-card">
                        <h3>Administradores</h3>
                        <strong>{loading ? "..." : administradores}</strong>
                    </section>
                </div>

                <section className="admin-panel-card">
                    <h2>Resumen de clientes</h2>
                    {loading ? (
                        <div className="admin-skeleton-block">
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                        </div>
                    ) : usuarios.length === 0 ? (
                        <p>No hay usuarios para mostrar.</p>
                    ) : (
                        <div className="table-scroll">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Correo</th>
                                        <th>Rol</th>
                                        <th>Registro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.map((usuario) => (
                                        <tr key={usuario.id} className={`admin-row-animated ${filasNuevas.includes(usuario.id) ? "row-new" : ""}`}>
                                            <td>{usuario.id}</td>
                                            <td>{usuario.nombre}</td>
                                            <td>{usuario.correo}</td>
                                            <td>{usuario.rol}</td>
                                            <td>{usuario.created_at ? new Date(usuario.created_at).toLocaleString() : "Sin fecha"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Clientes;