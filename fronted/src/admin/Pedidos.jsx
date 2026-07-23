import Sidebar from "./Sidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [filasNuevas, setFilasNuevas] = useState([]);
    const [filasEstadoCambiado, setFilasEstadoCambiado] = useState({});
    const [toasts, setToasts] = useState([]);
    const idsPreviosRef = useRef(new Set());
    const estadosPreviosRef = useRef(new Map());

    const mostrarToast = (texto, tipo) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((actuales) => [...actuales, { id, texto, tipo }]);

        setTimeout(() => {
            setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
        }, 3200);
    };

    const estadoLegible = (estado) => {
        const limpio = String(estado || "").trim().toLowerCase();
        if (!limpio) return "Sin estado";
        return limpio.charAt(0).toUpperCase() + limpio.slice(1);
    };

    const cargarPedidos = async () => {
        try {
            setMensaje("");
            const respuesta = await api.get("/pedidos/admin");
            const listaPedidos = Array.isArray(respuesta.data) ? respuesta.data : [];
            const idsNuevos = listaPedidos
                .filter((pedido) => !idsPreviosRef.current.has(pedido.id))
                .map((pedido) => pedido.id);

            const cambiosEstado = {};
            listaPedidos.forEach((pedido) => {
                const estadoAnterior = estadosPreviosRef.current.get(pedido.id);
                const estadoActual = String(pedido.estado || "").toLowerCase();
                if (estadoAnterior && estadoAnterior !== estadoActual) {
                    cambiosEstado[pedido.id] = estadoActual;
                    mostrarToast(
                        `Pedido #${pedido.id}: ${estadoLegible(estadoAnterior)} -> ${estadoLegible(estadoActual)}`,
                        estadoActual
                    );
                }
            });

            setPedidos(listaPedidos);
            if (idsPreviosRef.current.size > 0 && idsNuevos.length > 0) {
                setFilasNuevas(idsNuevos);
            }

            if (Object.keys(cambiosEstado).length > 0) {
                setFilasEstadoCambiado(cambiosEstado);
            }

            idsPreviosRef.current = new Set(listaPedidos.map((pedido) => pedido.id));
            estadosPreviosRef.current = new Map(
                listaPedidos.map((pedido) => [pedido.id, String(pedido.estado || "").toLowerCase()])
            );
        } catch (error) {
            console.error(error);
            setMensaje("No se pudieron cargar los pedidos. Inicia sesión como admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialLoadId = setTimeout(() => {
            cargarPedidos();
        }, 0);
        const intervalId = setInterval(cargarPedidos, 15000);
        return () => {
            clearTimeout(initialLoadId);
            clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (filasNuevas.length === 0) return;

        const timeoutId = setTimeout(() => {
            setFilasNuevas([]);
        }, 1800);

        return () => clearTimeout(timeoutId);
    }, [filasNuevas]);

    useEffect(() => {
        if (Object.keys(filasEstadoCambiado).length === 0) return;

        const timeoutId = setTimeout(() => {
            setFilasEstadoCambiado({});
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [filasEstadoCambiado]);

    const cambiarEstado = async (id, estado) => {
        try {
            await api.put(`/pedidos/admin/${id}`, { estado });
            cargarPedidos();
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo actualizar el estado del pedido.");
        }
    };

    const eliminarEnvio = async (id) => {
        const confirmar = window.confirm("¿Seguro que deseas eliminar este envío/pedido? Esta acción restaura el stock y no se puede deshacer.");
        if (!confirmar) return;

        try {
            await api.delete(`/pedidos/admin/${id}`);
            setMensaje("Envío eliminado correctamente.");
            cargarPedidos();
        } catch (error) {
            console.error(error);
            const mensajeApi = error?.response?.data?.mensaje;
            setMensaje(mensajeApi || "No se pudo eliminar el envío.");
        }
    };

    const pendientes = useMemo(
        () => pedidos.filter((pedido) => String(pedido.estado).toLowerCase() === "pendiente").length,
        [pedidos]
    );

    const entregados = useMemo(
        () => pedidos.filter((pedido) => String(pedido.estado).toLowerCase() === "entregado").length,
        [pedidos]
    );

    return (
        <div className="admin-container">
            <Sidebar />
            <main className="admin-content">
                <div className="toast-stack" aria-live="polite" aria-atomic="true">
                    {toasts.map((toast) => (
                        <div key={toast.id} className={`toast-notification toast-${toast.tipo || "default"}`}>
                            <span className="toast-dot" />
                            <span>{toast.texto}</span>
                        </div>
                    ))}
                </div>

                <div className="admin-page-header">
                    <div>
                        <p className="admin-overline">Operaciones</p>
                        <h1>Pedidos</h1>
                        <p className="admin-intro">Supervisa el flujo de pedidos y controla el estado de cada compra con rapidez.</p>
                    </div>
                    <button className="button-secondary" onClick={cargarPedidos}>Actualizar</button>
                </div>

                {mensaje && <p className="form-message">{mensaje}</p>}

                <div className="admin-grid">
                    <section className="admin-card">
                        <h3>Pedidos totales</h3>
                        <strong>{loading ? "..." : pedidos.length}</strong>
                    </section>
                    <section className="admin-card">
                        <h3>En proceso</h3>
                        <strong>{loading ? "..." : pendientes}</strong>
                    </section>
                    <section className="admin-card">
                        <h3>Entregados</h3>
                        <strong>{loading ? "..." : entregados}</strong>
                    </section>
                </div>

                <section className="admin-panel-card">
                    <h2>Estado de pedidos</h2>
                    {loading ? (
                        <div className="admin-skeleton-block">
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                        </div>
                    ) : pedidos.length === 0 ? (
                        <p>No hay pedidos registrados todavía.</p>
                    ) : (
                        <div className="table-scroll">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Pedido</th>
                                        <th>Cliente</th>
                                        <th>Total</th>
                                        <th>Estado</th>
                                        <th>Dirección</th>
                                        <th>Fecha</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidos.map((pedido) => (
                                        <tr
                                            key={pedido.id}
                                            className={`admin-row-animated ${filasNuevas.includes(pedido.id) ? "row-new" : ""} ${filasEstadoCambiado[pedido.id] ? `row-state-${filasEstadoCambiado[pedido.id]}` : ""}`}
                                        >
                                            <td>#{pedido.id}</td>
                                            <td>{pedido.usuario_nombre}<br />{pedido.usuario_correo}</td>
                                            <td>${Number(pedido.total || 0).toFixed(2)}</td>
                                            <td>
                                                <span className={`status-pill status-${String(pedido.estado || "").toLowerCase()} ${filasEstadoCambiado[pedido.id] ? "status-pill-pulse" : ""}`}>
                                                    {pedido.estado}
                                                </span>
                                            </td>
                                            <td>{pedido.direccion || "Recoger en tienda"}</td>
                                            <td>{new Date(pedido.fecha_pedido || pedido.created_at || pedido.fecha).toLocaleString()}</td>
                                            <td className="admin-actions">
                                                <button className="button-secondary" onClick={() => cambiarEstado(pedido.id, "Pendiente")}>Pendiente</button>
                                                <button className="button-primary" onClick={() => cambiarEstado(pedido.id, "Enviado")}>Enviado</button>
                                                <button className="button-danger" onClick={() => cambiarEstado(pedido.id, "Entregado")}>Entregado</button>
                                                <button className="button-danger" onClick={() => eliminarEnvio(pedido.id)}>Eliminar envío</button>
                                            </td>
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

export default Pedidos;