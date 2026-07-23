import Sidebar from "./Sidebar";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function useCountUp(valorObjetivo, duracion = 700) {
    const [valor, setValor] = useState(0);

    useEffect(() => {
        const inicio = performance.now();
        const objetivo = Number(valorObjetivo) || 0;

        const frame = (tiempo) => {
            const progreso = Math.min((tiempo - inicio) / duracion, 1);
            setValor(Math.round(objetivo * progreso));
            if (progreso < 1) {
                requestAnimationFrame(frame);
            }
        };

        requestAnimationFrame(frame);
    }, [valorObjetivo, duracion]);

    return valor;
}

function Dashboard() {
    const [stats, setStats] = useState({
        totalProductos: 0,
        totalUsuarios: 0,
        totalPedidos: 0,
        ventasTotales: 0,
        productosVendidos: 0
    });
    const [pedidos, setPedidos] = useState([]);
    const [compras, setCompras] = useState([]);
    const [productos, setProductos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [detallesPedidos, setDetallesPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
    const [tablaActiva, setTablaActiva] = useState("pedidos");
    const [filtroTexto, setFiltroTexto] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");

    const cargarDashboard = async () => {
        try {
            setMensaje("");
            const [statsRes, pedidosRes, productosRes, usuariosRes, categoriasRes, detallesRes] = await Promise.allSettled([
                api.get("/pedidos/estadisticas"),
                api.get("/pedidos/admin"),
                api.get("/productos"),
                api.get("/auth/usuarios"),
                api.get("/productos/categorias"),
                api.get("/pedidos/admin/detalles")
            ]);
            const comprasRes = await Promise.allSettled([api.get("/pedidos/admin/compras")]);

            if (statsRes.status === "fulfilled") {
                setStats(statsRes.value.data || {});
            }

            if (pedidosRes.status === "fulfilled") {
                setPedidos(Array.isArray(pedidosRes.value.data) ? pedidosRes.value.data : []);
            }

            if (productosRes.status === "fulfilled") {
                setProductos(Array.isArray(productosRes.value.data) ? productosRes.value.data : []);
            }

            if (usuariosRes.status === "fulfilled") {
                setUsuarios(Array.isArray(usuariosRes.value.data) ? usuariosRes.value.data : []);
            }

            if (categoriasRes.status === "fulfilled") {
                setCategorias(Array.isArray(categoriasRes.value.data) ? categoriasRes.value.data : []);
            }

            if (detallesRes.status === "fulfilled") {
                setDetallesPedidos(Array.isArray(detallesRes.value.data) ? detallesRes.value.data : []);
            }

            if (comprasRes[0].status === "fulfilled") {
                setCompras(Array.isArray(comprasRes[0].value.data) ? comprasRes[0].value.data : []);
            }

            if (statsRes.status === "rejected" || pedidosRes.status === "rejected") {
                setMensaje("No se pudieron cargar algunos datos del dashboard. Intenta actualizar de nuevo.");
            }

            setUltimaActualizacion(new Date());
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo cargar el dashboard. Inicia sesión como admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialLoadId = setTimeout(() => {
            cargarDashboard();
        }, 0);
        const intervalId = setInterval(cargarDashboard, 15000);
        return () => {
            clearTimeout(initialLoadId);
            clearInterval(intervalId);
        };
    }, []);

    const pedidosPendientes = useMemo(
        () => pedidos.filter((pedido) => String(pedido.estado).toLowerCase() === "pendiente").length,
        [pedidos]
    );

    const pedidosEntregados = useMemo(
        () => pedidos.filter((pedido) => String(pedido.estado).toLowerCase() === "entregado").length,
        [pedidos]
    );

    const hoy = new Date().toISOString().slice(0, 10);
    const ventasHoy = useMemo(() => {
        return pedidos.reduce((acumulado, pedido) => {
            const fecha = String(pedido.fecha_pedido || pedido.created_at || pedido.fecha || "").slice(0, 10);
            return fecha === hoy ? acumulado + Number(pedido.total || 0) : acumulado;
        }, 0);
    }, [pedidos, hoy]);

    const avanceEntregas = useMemo(() => {
        const total = Number(stats.totalPedidos || 0);
        if (total === 0) return 0;
        return Math.round((pedidosEntregados / total) * 100);
    }, [pedidosEntregados, stats.totalPedidos]);

    const totalProductosAnim = useCountUp(Number(stats.totalProductos || 0));
    const pendientesAnim = useCountUp(pedidosPendientes);
    const usuariosAnim = useCountUp(Number(stats.totalUsuarios || 0));
    const ventasHoyAnim = useCountUp(Math.round(ventasHoy));
    const pedidosTotalesAnim = useCountUp(Number(stats.totalPedidos || 0));
    const ventasTotalesAnim = useCountUp(Math.round(Number(stats.ventasTotales || 0)));
    const vendidosAnim = useCountUp(Number(stats.productosVendidos || 0));

    const formatearHora = (fecha) => {
        if (!fecha) return "-";
        return fecha.toLocaleTimeString();
    };

    const textoBusqueda = filtroTexto.trim().toLowerCase();

    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter((pedido) => {
            const coincideEstado = filtroEstado === "todos" || String(pedido.estado || "").toLowerCase() === filtroEstado;
            if (!coincideEstado) return false;

            if (!textoBusqueda) return true;
            const searchable = [
                pedido.id,
                pedido.usuario_nombre,
                pedido.usuario_correo,
                pedido.estado,
                pedido.direccion
            ].join(" ").toLowerCase();
            return searchable.includes(textoBusqueda);
        });
    }, [pedidos, filtroEstado, textoBusqueda]);

    const productosFiltrados = useMemo(() => {
        return productos.filter((producto) => {
            if (!textoBusqueda) return true;
            const searchable = [producto.id, producto.nombre, producto.categoria].join(" ").toLowerCase();
            return searchable.includes(textoBusqueda);
        });
    }, [productos, textoBusqueda]);

    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter((usuario) => {
            if (!textoBusqueda) return true;
            const searchable = [usuario.id, usuario.nombre, usuario.correo, usuario.rol, usuario.etiqueta_char].join(" ").toLowerCase();
            return searchable.includes(textoBusqueda);
        });
    }, [usuarios, textoBusqueda]);

    const categoriasFiltradas = useMemo(() => {
        return categorias.filter((categoria) => {
            if (!textoBusqueda) return true;
            const searchable = [categoria.id, categoria.nombre, categoria.codigo_char].join(" ").toLowerCase();
            return searchable.includes(textoBusqueda);
        });
    }, [categorias, textoBusqueda]);

    const detallesFiltrados = useMemo(() => {
        return detallesPedidos.filter((detalle) => {
            if (!textoBusqueda) return true;
            const searchable = [
                detalle.id,
                detalle.pedido_id,
                detalle.producto_id,
                detalle.producto_nombre,
                detalle.marca_char
            ].join(" ").toLowerCase();
            return searchable.includes(textoBusqueda);
        });
    }, [detallesPedidos, textoBusqueda]);

    const comprasFiltradas = useMemo(() => {
        return compras.filter((compra) => {
            if (!textoBusqueda) return true;
            const searchable = [
                compra.id,
                compra.pedido_id,
                compra.usuario_nombre,
                compra.correo,
                compra.direccion,
                compra.estado
            ].join(" ").toLowerCase();
            return searchable.includes(textoBusqueda);
        });
    }, [compras, textoBusqueda]);

    const editarTiposProducto = async (producto) => {
        const prioridad = window.prompt("Prioridad (INT)", String(producto.prioridad ?? 0));
        if (prioridad === null) return;
        const peso = window.prompt("Peso (FLOAT)", String(producto.peso ?? 0));
        if (peso === null) return;
        const codigo = window.prompt("Código (CHAR 12)", String(producto.codigo || "SIN-CODIGO"));
        if (codigo === null) return;

        try {
            await api.put(`/productos/${producto.id}/tipos`, {
                prioridad: Number(prioridad),
                peso: Number(peso),
                codigo: String(codigo).trim().toUpperCase()
            });
            setMensaje("Tipos de datos de producto actualizados.");
            cargarDashboard();
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "No se pudo actualizar el producto.");
        }
    };

    const editarTiposUsuario = async (usuario) => {
        const nivel = window.prompt("Nivel (INT)", String(usuario.nivel_int ?? 0));
        if (nivel === null) return;
        const credito = window.prompt("Crédito (FLOAT)", String(usuario.credito_float ?? 0));
        if (credito === null) return;
        const etiqueta = window.prompt("Etiqueta (CHAR 10)", String(usuario.etiqueta_char || "USR-BASE"));
        if (etiqueta === null) return;

        try {
            await api.put(`/auth/usuarios/${usuario.id}/tipos`, {
                nivel_int: Number(nivel),
                credito_float: Number(credito),
                etiqueta_char: String(etiqueta).trim().toUpperCase()
            });
            setMensaje("Tipos de datos de usuario actualizados.");
            cargarDashboard();
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "No se pudo actualizar el usuario.");
        }
    };

    const editarTiposCategoria = async (categoria) => {
        const orden = window.prompt("Orden (INT)", String(categoria.orden_int ?? 0));
        if (orden === null) return;
        const factor = window.prompt("Factor (FLOAT)", String(categoria.factor_float ?? 1));
        if (factor === null) return;
        const codigo = window.prompt("Código (CHAR 10)", String(categoria.codigo_char || "CAT-BASE"));
        if (codigo === null) return;

        try {
            await api.put(`/productos/categorias/${categoria.id}/tipos`, {
                orden_int: Number(orden),
                factor_float: Number(factor),
                codigo_char: String(codigo).trim().toUpperCase()
            });
            setMensaje("Tipos de datos de categoría actualizados.");
            cargarDashboard();
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "No se pudo actualizar la categoría.");
        }
    };

    const editarTiposPedido = async (pedido) => {
        const prioridad = window.prompt("Prioridad pedido (INT)", String(pedido.prioridad_int ?? 0));
        if (prioridad === null) return;
        const recargo = window.prompt("Recargo (FLOAT)", String(pedido.recargo_float ?? 0));
        if (recargo === null) return;
        const canal = window.prompt("Canal (CHAR 10)", String(pedido.canal_char || "WEB"));
        if (canal === null) return;

        try {
            await api.put(`/pedidos/admin/${pedido.id}/tipos`, {
                prioridad_int: Number(prioridad),
                recargo_float: Number(recargo),
                canal_char: String(canal).trim().toUpperCase()
            });
            setMensaje("Tipos de datos de pedido actualizados.");
            cargarDashboard();
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "No se pudo actualizar el pedido.");
        }
    };

    const editarTiposDetalle = async (detalle) => {
        const lote = window.prompt("Lote (INT)", String(detalle.lote_int ?? 0));
        if (lote === null) return;
        const impuesto = window.prompt("Impuesto (FLOAT)", String(detalle.impuesto_float ?? 0));
        if (impuesto === null) return;
        const marca = window.prompt("Marca (CHAR 10)", String(detalle.marca_char || "PP-BASE"));
        if (marca === null) return;

        try {
            await api.put(`/pedidos/admin/detalles/${detalle.id}/tipos`, {
                lote_int: Number(lote),
                impuesto_float: Number(impuesto),
                marca_char: String(marca).trim().toUpperCase()
            });
            setMensaje("Tipos de datos del detalle actualizados.");
            cargarDashboard();
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "No se pudo actualizar el detalle del pedido.");
        }
    };

    const editarCompra = async (compra) => {
        const correo = window.prompt("Correo", String(compra.correo || ""));
        if (correo === null) return;
        const direccion = window.prompt("Dirección", String(compra.direccion || ""));
        if (direccion === null) return;
        const total = window.prompt("Total", String(compra.total ?? 0));
        if (total === null) return;
        const estado = window.prompt("Estado", String(compra.estado || "Pendiente"));
        if (estado === null) return;
        const correoEnviado = window.confirm("¿Marcar correo como enviado? Acepta para sí, cancela para no.");

        try {
            await api.put(`/pedidos/admin/compras/${compra.id}`, {
                correo: String(correo).trim(),
                direccion: String(direccion).trim(),
                total: Number(total),
                estado: String(estado).trim(),
                correo_enviado: correoEnviado
            });
            setMensaje("Compra actualizada correctamente.");
            cargarDashboard();
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "No se pudo actualizar la compra.");
        }
    };

    const eliminarCompra = async (compra) => {
        const confirmar = window.confirm(`¿Eliminar la compra #${compra.id}? Esto solo borra el registro de compras.`);
        if (!confirmar) return;

        try {
            await api.delete(`/pedidos/admin/compras/${compra.id}`);
            setMensaje("Compra eliminada correctamente.");
            cargarDashboard();
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "No se pudo eliminar la compra.");
        }
    };

    return (
        <div className="admin-container">
            <Sidebar />
            <main className="admin-content">
                <div className="admin-page-header">
                    <div>
                        <p className="admin-overline">Panel de control</p>
                        <h1>Bienvenido, administrador</h1>
                        <p className="admin-intro">Gestiona productos, pedidos y clientes desde un panel organizado y moderno.</p>
                    </div>
                    <div className="dashboard-actions">
                        <span className="live-chip">Actualizado: {formatearHora(ultimaActualizacion)}</span>
                        <Link to="/admin/agregar">
                            <button className="button-primary">Agregar producto</button>
                        </Link>
                        <Link to="/admin/productos">
                            <button className="button-secondary">Ver productos</button>
                        </Link>
                    </div>
                </div>

                {mensaje && <p className="form-message">{mensaje}</p>}

                <div className="admin-metrics">
                    <div className="admin-card metric-card">
                        <span>Productos activos</span>
                        <strong>{loading ? <span className="skeleton-line short" /> : totalProductosAnim}</strong>
                    </div>
                    <div className="admin-card metric-card">
                        <span>Pedidos pendientes</span>
                        <strong>{loading ? <span className="skeleton-line short" /> : pendientesAnim}</strong>
                    </div>
                    <div className="admin-card metric-card">
                        <span>Usuarios registrados</span>
                        <strong>{loading ? <span className="skeleton-line short" /> : usuariosAnim}</strong>
                    </div>
                    <div className="admin-card metric-card pulse-card">
                        <span>Ventas hoy</span>
                        <strong>{loading ? <span className="skeleton-line short" /> : `$${ventasHoyAnim.toFixed(2)}`}</strong>
                    </div>
                </div>

                <section className="admin-panel-card">
                    <h2>Resumen rápido</h2>
                    <p>Este tablero se actualiza automáticamente cada 15 segundos para reflejar cambios reales en productos, pedidos y usuarios.</p>
                    <div className="admin-inline-stats">
                        <span>Pedidos totales: <strong>{loading ? "..." : pedidosTotalesAnim}</strong></span>
                        <span>Ventas acumuladas: <strong>{loading ? "..." : `$${ventasTotalesAnim.toFixed(2)}`}</strong></span>
                        <span>Productos vendidos: <strong>{loading ? "..." : vendidosAnim}</strong></span>
                    </div>
                    <div className="delivery-progress">
                        <div className="delivery-progress-top">
                            <span>Pedidos entregados</span>
                            <strong>{avanceEntregas}%</strong>
                        </div>
                        <div className="delivery-progress-track">
                            <div className="delivery-progress-fill" style={{ width: `${avanceEntregas}%` }} />
                        </div>
                    </div>
                    <button className="button-secondary" onClick={cargarDashboard}>Actualizar ahora</button>
                </section>

                <section className="admin-panel-card">
                    <h2>Tablas del sistema</h2>
                    <p>Consulta tus tablas principales en un solo lugar y filtra la información en tiempo real.</p>

                    <div className="dashboard-table-controls">
                        <div className="table-selector-buttons">
                            <button
                                className={`button-secondary table-filter-button ${tablaActiva === "pedidos" ? "is-active" : ""}`}
                                onClick={() => setTablaActiva("pedidos")}
                            >
                                Pedidos ({pedidos.length})
                            </button>
                            <button
                                className={`button-secondary table-filter-button ${tablaActiva === "productos" ? "is-active" : ""}`}
                                onClick={() => setTablaActiva("productos")}
                            >
                                Productos ({productos.length})
                            </button>
                            <button
                                className={`button-secondary table-filter-button ${tablaActiva === "usuarios" ? "is-active" : ""}`}
                                onClick={() => setTablaActiva("usuarios")}
                            >
                                Clientes ({usuarios.length})
                            </button>
                            <button
                                className={`button-secondary table-filter-button ${tablaActiva === "categorias" ? "is-active" : ""}`}
                                onClick={() => setTablaActiva("categorias")}
                            >
                                Categorías ({categorias.length})
                            </button>
                            <button
                                className={`button-secondary table-filter-button ${tablaActiva === "detalles" ? "is-active" : ""}`}
                                onClick={() => setTablaActiva("detalles")}
                            >
                                Detalles pedidos ({detallesPedidos.length})
                            </button>
                            <button
                                className={`button-secondary table-filter-button ${tablaActiva === "compras" ? "is-active" : ""}`}
                                onClick={() => setTablaActiva("compras")}
                            >
                                Compras ({compras.length})
                            </button>
                        </div>

                        <div className="table-filter-row">
                            <input
                                className="table-search-input"
                                type="text"
                                placeholder="Buscar por ID, nombre, correo, categoría..."
                                value={filtroTexto}
                                onChange={(e) => setFiltroTexto(e.target.value)}
                            />

                            {tablaActiva === "pedidos" && (
                                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                                    <option value="todos">Todos los estados</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="enviado">Enviado</option>
                                    <option value="entregado">Entregado</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="admin-skeleton-block">
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                            <div className="skeleton-line full" />
                        </div>
                    ) : (
                        <div className="table-scroll">
                            {tablaActiva === "pedidos" && (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Cliente</th>
                                            <th>Total</th>
                                            <th>Estado</th>
                                            <th>Prioridad INT</th>
                                            <th>Recargo FLOAT</th>
                                            <th>Canal CHAR</th>
                                            <th>Fecha</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pedidosFiltrados.map((pedido) => (
                                            <tr key={pedido.id}>
                                                <td>#{pedido.id}</td>
                                                <td>{pedido.usuario_nombre}<br />{pedido.usuario_correo}</td>
                                                <td>${Number(pedido.total || 0).toFixed(2)}</td>
                                                <td>{pedido.estado}</td>
                                                <td>{Number(pedido.prioridad_int || 0)}</td>
                                                <td>{Number(pedido.recargo_float || 0).toFixed(2)}</td>
                                                <td>{pedido.canal_char || "WEB"}</td>
                                                <td>{new Date(pedido.fecha_pedido || pedido.created_at || pedido.fecha).toLocaleString()}</td>
                                                <td><button className="button-secondary" onClick={() => editarTiposPedido(pedido)}>Editar tipos</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {tablaActiva === "productos" && (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>Categoría</th>
                                            <th>Precio</th>
                                            <th>Stock</th>
                                            <th>Prioridad INT</th>
                                            <th>Peso FLOAT</th>
                                            <th>Código CHAR</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productosFiltrados.map((producto) => (
                                            <tr key={producto.id}>
                                                <td>#{producto.id}</td>
                                                <td>{producto.nombre}</td>
                                                <td>{producto.categoria || "Sin categoría"}</td>
                                                <td>${Number(producto.precio || 0).toFixed(2)}</td>
                                                <td>{Number(producto.stock || 0)}</td>
                                                <td>{Number(producto.prioridad || 0)}</td>
                                                <td>{Number(producto.peso || 0).toFixed(2)}</td>
                                                <td>{producto.codigo || "SIN-CODIGO"}</td>
                                                <td><button className="button-secondary" onClick={() => editarTiposProducto(producto)}>Editar tipos</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {tablaActiva === "usuarios" && (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>Correo</th>
                                            <th>Rol</th>
                                            <th>Nivel INT</th>
                                            <th>Crédito FLOAT</th>
                                            <th>Etiqueta CHAR</th>
                                            <th>Registro</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuariosFiltrados.map((usuario) => (
                                            <tr key={usuario.id}>
                                                <td>#{usuario.id}</td>
                                                <td>{usuario.nombre}</td>
                                                <td>{usuario.correo}</td>
                                                <td>{usuario.rol}</td>
                                                <td>{Number(usuario.nivel_int || 0)}</td>
                                                <td>{Number(usuario.credito_float || 0).toFixed(2)}</td>
                                                <td>{usuario.etiqueta_char || "USR-BASE"}</td>
                                                <td>{usuario.created_at ? new Date(usuario.created_at).toLocaleString() : "Sin fecha"}</td>
                                                <td><button className="button-secondary" onClick={() => editarTiposUsuario(usuario)}>Editar tipos</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {tablaActiva === "categorias" && (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>Orden INT</th>
                                            <th>Factor FLOAT</th>
                                            <th>Código CHAR</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoriasFiltradas.map((categoria) => (
                                            <tr key={categoria.id}>
                                                <td>#{categoria.id}</td>
                                                <td>{categoria.nombre}</td>
                                                <td>{Number(categoria.orden_int || 0)}</td>
                                                <td>{Number(categoria.factor_float || 0).toFixed(2)}</td>
                                                <td>{categoria.codigo_char || "CAT-BASE"}</td>
                                                <td><button className="button-secondary" onClick={() => editarTiposCategoria(categoria)}>Editar tipos</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {tablaActiva === "detalles" && (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Pedido</th>
                                            <th>Producto</th>
                                            <th>Cantidad</th>
                                            <th>Lote INT</th>
                                            <th>Impuesto FLOAT</th>
                                            <th>Marca CHAR</th>
                                            <th>Timestamp</th>
                                            <th>Actualizado</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detallesFiltrados.map((detalle) => (
                                            <tr key={detalle.id}>
                                                <td>#{detalle.id}</td>
                                                <td>#{detalle.pedido_id}</td>
                                                <td>{detalle.producto_nombre || `ID ${detalle.producto_id}`}</td>
                                                <td>{Number(detalle.cantidad || 0)}</td>
                                                <td>{Number(detalle.lote_int || 0)}</td>
                                                <td>{Number(detalle.impuesto_float || 0).toFixed(2)}</td>
                                                <td>{detalle.marca_char || "PP-BASE"}</td>
                                                <td>{detalle.created_at ? new Date(detalle.created_at).toLocaleString() : "Sin fecha"}</td>
                                                <td>{detalle.updated_at ? new Date(detalle.updated_at).toLocaleString() : "Sin fecha"}</td>
                                                <td><button className="button-secondary" onClick={() => editarTiposDetalle(detalle)}>Editar tipos</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {tablaActiva === "compras" && (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Pedido</th>
                                            <th>Cliente</th>
                                            <th>Correo</th>
                                            <th>Dirección</th>
                                            <th>Total</th>
                                            <th>Estado</th>
                                            <th>Correo enviado</th>
                                            <th>Fecha</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comprasFiltradas.map((compra) => (
                                            <tr key={compra.id}>
                                                <td>#{compra.id}</td>
                                                <td>#{compra.pedido_id}</td>
                                                <td>{compra.usuario_nombre}</td>
                                                <td>{compra.correo}</td>
                                                <td>{compra.direccion}</td>
                                                <td>${Number(compra.total || 0).toFixed(2)}</td>
                                                <td>{compra.estado}</td>
                                                <td>{Number(compra.correo_enviado || 0) === 1 ? "Sí" : "No"}</td>
                                                <td>{compra.created_at ? new Date(compra.created_at).toLocaleString() : "Sin fecha"}</td>
                                                <td>
                                                    <button className="button-secondary" onClick={() => editarCompra(compra)}>Editar</button>
                                                    <button className="button-danger" onClick={() => eliminarCompra(compra)}>Eliminar</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {tablaActiva === "pedidos" && pedidosFiltrados.length === 0 && <p>No hay pedidos con ese filtro.</p>}
                            {tablaActiva === "categorias" && categoriasFiltradas.length === 0 && <p>No hay categorías con ese filtro.</p>}
                            {tablaActiva === "detalles" && detallesFiltrados.length === 0 && <p>No hay detalles de pedido con ese filtro.</p>}
                            {tablaActiva === "compras" && comprasFiltradas.length === 0 && <p>No hay compras con ese filtro.</p>}
                            {tablaActiva === "productos" && productosFiltrados.length === 0 && <p>No hay productos con ese filtro.</p>}
                            {tablaActiva === "usuarios" && usuariosFiltrados.length === 0 && <p>No hay clientes con ese filtro.</p>}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Dashboard;