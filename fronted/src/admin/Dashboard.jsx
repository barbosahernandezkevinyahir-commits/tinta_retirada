import Sidebar from "./Sidebar";
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
            if (progreso < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }, [valorObjetivo, duracion]);
    return valor;
}

function Dashboard() {
    const [stats, setStats] = useState({ totalProductos: 0, totalUsuarios: 0, totalPedidos: 0, ventasTotales: 0, productosVendidos: 0 });
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
    const [modalVisible, setModalVisible] = useState(false);
    const [modoModal, setModoModal] = useState("crear");
    const [tipoModal, setTipoModal] = useState(null);
    const [datoModal, setDatoModal] = useState({});

    const cargarDashboard = async () => {
        try {
            setMensaje("");
            const [statsRes, pedidosRes, productosRes, usuariosRes, categoriasRes, detallesRes, comprasRes] = await Promise.allSettled([
                api.get("/pedidos/estadisticas"),
                api.get("/pedidos/admin"),
                api.get("/productos"),
                api.get("/auth/usuarios"),
                api.get("/productos/categorias"),
                api.get("/pedidos/admin/detalles"),
                api.get("/pedidos/admin/compras")
            ]);
            
            if (statsRes.status === "fulfilled") setStats(statsRes.value.data || {});
            if (pedidosRes.status === "fulfilled") setPedidos(Array.isArray(pedidosRes.value.data) ? pedidosRes.value.data : []);
            if (productosRes.status === "fulfilled") setProductos(Array.isArray(productosRes.value.data) ? productosRes.value.data : []);
            if (usuariosRes.status === "fulfilled") setUsuarios(Array.isArray(usuariosRes.value.data) ? usuariosRes.value.data : []);
            if (categoriasRes.status === "fulfilled") setCategorias(Array.isArray(categoriasRes.value.data) ? categoriasRes.value.data : []);
            if (detallesRes.status === "fulfilled") setDetallesPedidos(Array.isArray(detallesRes.value.data) ? detallesRes.value.data : []);
            if (comprasRes.status === "fulfilled") setCompras(Array.isArray(comprasRes.value.data) ? comprasRes.value.data : []);
            
            setUltimaActualizacion(new Date());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDashboard();
        const intervalId = setInterval(cargarDashboard, 15000);
        return () => clearInterval(intervalId);
    }, []);

    const abrirModal = (tipo, modo, dato = {}) => {
        setTipoModal(tipo);
        setModoModal(modo);
        setDatoModal(dato);
        setModalVisible(true);
    };

    const cerrarModal = () => {
        setModalVisible(false);
        setDatoModal({});
    };

    const guardarModal = async () => {
        try {
            if (tipoModal === "producto") {
                if (modoModal === "crear") await api.post("/productos", datoModal);
                else await api.put(`/productos/${datoModal.id}`, datoModal);
                setMensaje("Producto guardado.");
            } else if (tipoModal === "categoria") {
                if (modoModal === "crear") await api.post("/productos/categorias", datoModal);
                else await api.put(`/productos/categorias/${datoModal.id}`, datoModal);
                setMensaje("Categoría guardada.");
            } else if (tipoModal === "usuario") {
                if (modoModal === "crear") await api.post("/auth/usuarios", datoModal);
                else await api.put(`/auth/usuarios/${datoModal.id}`, datoModal);
                setMensaje("Usuario guardado.");
            } else if (tipoModal === "pedido") {
                await api.put(`/pedidos/admin/${datoModal.id}/tipos`, datoModal);
                setMensaje("Pedido guardado.");
            } else if (tipoModal === "compra") {
                await api.put(`/pedidos/admin/compras/${datoModal.id}`, datoModal);
                setMensaje("Compra guardada.");
            }
            cerrarModal();
            setTimeout(cargarDashboard, 500);
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "Error al guardar.");
        }
    };

    const eliminar = async (tipo, id, nombre = "") => {
        if (!window.confirm(`¿Eliminar ${nombre || "elemento"}?`)) return;
        try {
            const endpoints = {
                producto: `/productos/${id}`,
                categoria: `/productos/categorias/${id}`,
                usuario: `/auth/usuarios/${id}`,
                pedido: `/pedidos/admin/${id}`,
                detalle: `/pedidos/admin/detalles/${id}`,
                compra: `/pedidos/admin/compras/${id}`
            };
            await api.delete(endpoints[tipo]);
            setMensaje("Elemento eliminado.");
            setTimeout(cargarDashboard, 500);
        } catch (error) {
            setMensaje(error?.response?.data?.mensaje || "Error al eliminar.");
        }
    };

    const totalProductosAnim = useCountUp(Number(stats.totalProductos || 0));
    const pendientesAnim = useCountUp(pedidos.filter(p => String(p.estado).toLowerCase() === "pendiente").length);
    const usuariosAnim = useCountUp(Number(stats.totalUsuarios || 0));
    const pedidosTotalesAnim = useCountUp(Number(stats.totalPedidos || 0));
    const ventasTotalesAnim = useCountUp(Math.round(Number(stats.ventasTotales || 0)));

    const textoBusqueda = filtroTexto.trim().toLowerCase();
    const pedidosFiltrados = useMemo(() => pedidos.filter(p => {
        const coincideEstado = filtroEstado === "todos" || String(p.estado || "").toLowerCase() === filtroEstado;
        return coincideEstado && (!textoBusqueda || [p.id, p.usuario_nombre, p.usuario_correo].join(" ").toLowerCase().includes(textoBusqueda));
    }), [pedidos, filtroEstado, textoBusqueda]);

    const productosFiltrados = useMemo(() => productos.filter(p => !textoBusqueda || [p.id, p.nombre].join(" ").toLowerCase().includes(textoBusqueda)), [productos, textoBusqueda]);
    const usuariosFiltrados = useMemo(() => usuarios.filter(u => !textoBusqueda || [u.id, u.nombre, u.correo].join(" ").toLowerCase().includes(textoBusqueda)), [usuarios, textoBusqueda]);
    const categoriasFiltradas = useMemo(() => categorias.filter(c => !textoBusqueda || [c.id, c.nombre].join(" ").toLowerCase().includes(textoBusqueda)), [categorias, textoBusqueda]);
    const detallesFiltrados = useMemo(() => detallesPedidos.filter(d => !textoBusqueda || [d.id, d.pedido_id].join(" ").toLowerCase().includes(textoBusqueda)), [detallesPedidos, textoBusqueda]);
    const comprasFiltradas = useMemo(() => compras.filter(c => !textoBusqueda || [c.id, c.usuario_nombre].join(" ").toLowerCase().includes(textoBusqueda)), [compras, textoBusqueda]);

    return (
        <div className="admin-container">
            <Sidebar />
            <main className="admin-content">
                <div className="admin-page-header">
                    <div>
                        <h1>Panel administrativo - Tinta Retirada</h1>
                        <p className="admin-intro">Gestión completa de productos, pedidos, usuarios y más.</p>
                    </div>
                    <div className="dashboard-actions">
                        <span className="live-chip">Actualizado: {ultimaActualizacion?.toLocaleTimeString() || "-"}</span>
                        <button className="button-primary" onClick={() => abrirModal("producto", "crear")}>➕ Producto</button>
                        <button className="button-secondary" onClick={() => abrirModal("categoria", "crear")}>➕ Categoría</button>
                        <button className="button-secondary" onClick={() => abrirModal("usuario", "crear")}>➕ Usuario</button>
                    </div>
                </div>

                {mensaje && <p className="form-message">{mensaje}</p>}

                <div className="admin-metrics">
                    <div className="admin-card metric-card"><span>Productos</span><strong>{loading ? "..." : totalProductosAnim}</strong></div>
                    <div className="admin-card metric-card"><span>Pendientes</span><strong>{loading ? "..." : pendientesAnim}</strong></div>
                    <div className="admin-card metric-card"><span>Usuarios</span><strong>{loading ? "..." : usuariosAnim}</strong></div>
                    <div className="admin-card metric-card pulse-card"><span>Ventas</span><strong>{loading ? "..." : `$${ventasTotalesAnim.toFixed(2)}`}</strong></div>
                </div>

                <section className="admin-panel-card">
                    <h2>Tablas del sistema</h2>
                    <div className="dashboard-table-controls">
                        <div className="table-selector-buttons">
                            <button className={`button-secondary ${tablaActiva === "pedidos" ? "is-active" : ""}`} onClick={() => setTablaActiva("pedidos")}>Pedidos ({pedidos.length})</button>
                            <button className={`button-secondary ${tablaActiva === "productos" ? "is-active" : ""}`} onClick={() => setTablaActiva("productos")}>Productos ({productos.length})</button>
                            <button className={`button-secondary ${tablaActiva === "usuarios" ? "is-active" : ""}`} onClick={() => setTablaActiva("usuarios")}>Usuarios ({usuarios.length})</button>
                            <button className={`button-secondary ${tablaActiva === "categorias" ? "is-active" : ""}`} onClick={() => setTablaActiva("categorias")}>Categorías ({categorias.length})</button>
                            <button className={`button-secondary ${tablaActiva === "detalles" ? "is-active" : ""}`} onClick={() => setTablaActiva("detalles")}>Detalles ({detallesPedidos.length})</button>
                            <button className={`button-secondary ${tablaActiva === "compras" ? "is-active" : ""}`} onClick={() => setTablaActiva("compras")}>Compras ({compras.length})</button>
                        </div>
                        <div className="table-filter-row">
                            <input className="table-search-input" type="text" placeholder="Buscar..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} />
                            {tablaActiva === "pedidos" && <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                                <option value="todos">Todos</option><option value="pendiente">Pendiente</option><option value="enviado">Enviado</option><option value="entregado">Entregado</option>
                            </select>}
                        </div>
                    </div>

                    {loading ? <p>Cargando...</p> : (
                        <div className="table-scroll">
                            {tablaActiva === "pedidos" && (
                                <table className="admin-table">
                                    <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
                                    <tbody>{pedidosFiltrados.map(p => (
                                        <tr key={p.id}><td>#{p.id}</td><td>{p.usuario_nombre}<br/>{p.usuario_correo}</td><td>${Number(p.total || 0).toFixed(2)}</td><td>{p.estado}</td><td>{new Date(p.fecha_pedido || p.created_at).toLocaleDateString()}</td><td>
                                            <button className="button-secondary" onClick={() => abrirModal("pedido", "editar", p)}>Editar</button>
                                            <button className="button-danger" onClick={() => eliminar("pedido", p.id, `Pedido #${p.id}`)}>Eliminar</button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            )}

                            {tablaActiva === "productos" && (
                                <table className="admin-table">
                                    <thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead>
                                    <tbody>{productosFiltrados.map(p => (
                                        <tr key={p.id}><td>#{p.id}</td><td>{p.nombre}</td><td>{p.categoria}</td><td>${Number(p.precio || 0).toFixed(2)}</td><td>{Number(p.stock || 0)}</td><td>
                                            <button className="button-secondary" onClick={() => abrirModal("producto", "editar", p)}>Editar</button>
                                            <button className="button-danger" onClick={() => eliminar("producto", p.id, p.nombre)}>Eliminar</button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            )}

                            {tablaActiva === "usuarios" && (
                                <table className="admin-table">
                                    <thead><tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead>
                                    <tbody>{usuariosFiltrados.map(u => (
                                        <tr key={u.id}><td>#{u.id}</td><td>{u.nombre}</td><td>{u.correo}</td><td>{u.rol}</td><td>
                                            <button className="button-secondary" onClick={() => abrirModal("usuario", "editar", u)}>Editar</button>
                                            <button className="button-danger" onClick={() => eliminar("usuario", u.id, u.nombre)}>Eliminar</button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            )}

                            {tablaActiva === "categorias" && (
                                <table className="admin-table">
                                    <thead><tr><th>ID</th><th>Nombre</th><th>Orden</th><th>Factor</th><th>Acciones</th></tr></thead>
                                    <tbody>{categoriasFiltradas.map(c => (
                                        <tr key={c.id}><td>#{c.id}</td><td>{c.nombre}</td><td>{Number(c.orden_int || 0)}</td><td>{Number(c.factor_float || 1).toFixed(2)}</td><td>
                                            <button className="button-secondary" onClick={() => abrirModal("categoria", "editar", c)}>Editar</button>
                                            <button className="button-danger" onClick={() => eliminar("categoria", c.id, c.nombre)}>Eliminar</button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            )}

                            {tablaActiva === "detalles" && (
                                <table className="admin-table">
                                    <thead><tr><th>ID</th><th>Pedido</th><th>Producto</th><th>Cantidad</th><th>Acciones</th></tr></thead>
                                    <tbody>{detallesFiltrados.map(d => (
                                        <tr key={d.id}><td>#{d.id}</td><td>#{d.pedido_id}</td><td>{d.producto_nombre}</td><td>{Number(d.cantidad || 0)}</td><td>
                                            <button className="button-danger" onClick={() => eliminar("detalle", d.id, `Detalle #${d.id}`)}>Eliminar</button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            )}

                            {tablaActiva === "compras" && (
                                <table className="admin-table">
                                    <thead><tr><th>ID</th><th>Cliente</th><th>Correo</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
                                    <tbody>{comprasFiltradas.map(c => (
                                        <tr key={c.id}><td>#{c.id}</td><td>{c.usuario_nombre}</td><td>{c.correo}</td><td>${Number(c.total || 0).toFixed(2)}</td><td>{c.estado}</td><td>
                                            <button className="button-secondary" onClick={() => abrirModal("compra", "editar", c)}>Editar</button>
                                            <button className="button-danger" onClick={() => eliminar("compra", c.id, `Compra #${c.id}`)}>Eliminar</button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {modalVisible && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modoModal === "crear" ? "Crear" : "Editar"} {tipoModal}</h2>
                            <button className="modal-close-btn" onClick={cerrarModal}>✕</button>
                        </div>

                        <div className="modal-body">
                            {tipoModal === "producto" && (
                                <>
                                    <input placeholder="Nombre" value={datoModal.nombre || ""} onChange={(e) => setDatoModal({...datoModal, nombre: e.target.value})} />
                                    <input placeholder="Descripción" value={datoModal.descripcion || ""} onChange={(e) => setDatoModal({...datoModal, descripcion: e.target.value})} />
                                    <input type="number" placeholder="Precio" value={datoModal.precio || ""} onChange={(e) => setDatoModal({...datoModal, precio: e.target.value})} />
                                    <input type="number" placeholder="Stock" value={datoModal.stock || ""} onChange={(e) => setDatoModal({...datoModal, stock: e.target.value})} />
                                </>
                            )}

                            {tipoModal === "categoria" && (
                                <>
                                    <input placeholder="Nombre" value={datoModal.nombre || ""} onChange={(e) => setDatoModal({...datoModal, nombre: e.target.value})} />
                                    <input type="number" placeholder="Orden" value={datoModal.orden_int || ""} onChange={(e) => setDatoModal({...datoModal, orden_int: e.target.value})} />
                                    <input type="number" placeholder="Factor" value={datoModal.factor_float || ""} onChange={(e) => setDatoModal({...datoModal, factor_float: e.target.value})} />
                                </>
                            )}

                            {tipoModal === "usuario" && (
                                <>
                                    <input placeholder="Nombre" value={datoModal.nombre || ""} onChange={(e) => setDatoModal({...datoModal, nombre: e.target.value})} />
                                    <input type="email" placeholder="Correo" value={datoModal.correo || ""} onChange={(e) => setDatoModal({...datoModal, correo: e.target.value})} />
                                    {modoModal === "crear" && <input type="password" placeholder="Contraseña" value={datoModal.password || ""} onChange={(e) => setDatoModal({...datoModal, password: e.target.value})} />}
                                    <select value={datoModal.rol || "user"} onChange={(e) => setDatoModal({...datoModal, rol: e.target.value})}>
                                        <option value="user">Usuario</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </>
                            )}

                            {tipoModal === "pedido" && (
                                <>
                                    <input type="number" placeholder="Prioridad" value={datoModal.prioridad_int || ""} onChange={(e) => setDatoModal({...datoModal, prioridad_int: e.target.value})} />
                                    <input placeholder="Estado" value={datoModal.estado || ""} onChange={(e) => setDatoModal({...datoModal, estado: e.target.value})} />
                                </>
                            )}

                            {tipoModal === "compra" && (
                                <>
                                    <input type="email" placeholder="Correo" value={datoModal.correo || ""} onChange={(e) => setDatoModal({...datoModal, correo: e.target.value})} />
                                    <input type="number" placeholder="Total" value={datoModal.total || ""} onChange={(e) => setDatoModal({...datoModal, total: e.target.value})} />
                                    <select value={datoModal.estado || ""} onChange={(e) => setDatoModal({...datoModal, estado: e.target.value})}>
                                        <option value="">Seleccionar</option><option value="Pendiente">Pendiente</option><option value="Enviado">Enviado</option><option value="Entregado">Entregado</option>
                                    </select>
                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="button-secondary" onClick={cerrarModal}>Cancelar</button>
                            <button className="button-primary" onClick={guardarModal}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
