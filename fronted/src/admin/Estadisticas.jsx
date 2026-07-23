import Sidebar from "./Sidebar";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function Estadisticas() {
    const [stats, setStats] = useState({
        totalProductos: 0,
        totalUsuarios: 0,
        totalPedidos: 0,
        ventasTotales: 0,
        productosVendidos: 0
    });
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState("");

    const cargarEstadisticas = async () => {
        try {
            setMensaje("");
            const respuesta = await api.get("/pedidos/estadisticas");
            setStats(respuesta.data || {});
        } catch (error) {
            console.error(error);
            setMensaje("No se pudieron cargar las estadísticas. Inicia sesión como admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialLoadId = setTimeout(() => {
            cargarEstadisticas();
        }, 0);
        const intervalId = setInterval(cargarEstadisticas, 15000);
        return () => {
            clearTimeout(initialLoadId);
            clearInterval(intervalId);
        };
    }, []);

    const ticketPromedio = useMemo(() => {
        const pedidos = Number(stats.totalPedidos || 0);
        if (pedidos === 0) return 0;
        return Number(stats.ventasTotales || 0) / pedidos;
    }, [stats]);

    return (
        <div className="admin-container">
            <Sidebar />
            <main className="admin-content">
                <div className="admin-page-header">
                    <div>
                        <p className="admin-overline">Análisis</p>
                        <h1>Estadísticas</h1>
                        <p className="admin-intro">Visualiza los indicadores clave de la tienda y calcula el rendimiento en tiempo real.</p>
                    </div>
                    <button className="button-secondary" onClick={cargarEstadisticas}>Actualizar</button>
                </div>

                {mensaje && <p className="form-message">{mensaje}</p>}

                <div className="admin-grid">
                    <section className="admin-card">
                        <h3>Ventas totales</h3>
                        <strong>{loading ? <span className="skeleton-line short" /> : `$${Number(stats.ventasTotales || 0).toFixed(2)}`}</strong>
                    </section>
                    <section className="admin-card">
                        <h3>Pedidos procesados</h3>
                        <strong>{loading ? <span className="skeleton-line short" /> : Number(stats.totalPedidos || 0)}</strong>
                    </section>
                    <section className="admin-card">
                        <h3>Ticket promedio</h3>
                        <strong>{loading ? <span className="skeleton-line short" /> : `$${ticketPromedio.toFixed(2)}`}</strong>
                    </section>
                </div>

                <section className="admin-panel-card admin-chart-card">
                    <h2>Visión general</h2>
                    <p>Datos en tiempo real (actualización automática cada 15 segundos):</p>
                    {loading ? (
                        <div className="admin-skeleton-block">
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                        </div>
                    ) : (
                        <div className="admin-inline-stats">
                            <span>Productos: <strong>{Number(stats.totalProductos || 0)}</strong></span>
                            <span>Usuarios: <strong>{Number(stats.totalUsuarios || 0)}</strong></span>
                            <span>Productos vendidos: <strong>{Number(stats.productosVendidos || 0)}</strong></span>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Estadisticas;