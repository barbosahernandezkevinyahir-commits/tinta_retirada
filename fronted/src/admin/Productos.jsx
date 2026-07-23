import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "./Sidebar";
import { Link, useLocation } from "react-router-dom";

function Productos() {
    const [productos, setProductos] = useState([]);
    const [mostrarToastCreado, setMostrarToastCreado] = useState(true);
    const location = useLocation();
    const productoCreadoId = Number(new URLSearchParams(location.search).get("creado"));

    useEffect(() => {
        if (!productoCreadoId) return;
        const openToastId = setTimeout(() => {
            setMostrarToastCreado(true);
        }, 0);
        const timeoutId = setTimeout(() => setMostrarToastCreado(false), 6000);
        return () => {
            clearTimeout(openToastId);
            clearTimeout(timeoutId);
        };
    }, [productoCreadoId]);

    const obtenerUrlImagen = (imagen) => {
        if (!imagen) {
            return "https://via.placeholder.com/120x120?text=Sin+imagen";
        }
        return imagen.startsWith("http")
            ? imagen
            : `http://localhost:5000/uploads/${imagen}`;
    };

    const cargarProductos = () => {
        api.get("/productos")
            .then(res => {
                setProductos(res.data);
            });
    };

    useEffect(() => {
        const initialLoadId = setTimeout(() => {
            cargarProductos();
        }, 0);
        return () => clearTimeout(initialLoadId);
    }, []);

    const eliminar = async (id) => {
        if (!window.confirm("¿Eliminar producto?")) return;
        await api.delete(`/productos/${id}`);
        cargarProductos();
    };

    return (
        <div className="admin-container">
            <Sidebar />
            <main className="admin-content">
                <div className="admin-page-header">
                    <div>
                        <p className="admin-overline">Gestión de catálogo</p>
                        <h1>Productos</h1>
                    </div>
                    <Link to="/admin/agregar">
                        <button className="button-primary">Nuevo producto</button>
                    </Link>
                </div>

                {productoCreadoId > 0 && mostrarToastCreado && (
                    <div className="admin-success-toast" role="status" aria-live="polite">
                        <div>
                            <strong>Producto creado</strong>
                            <p>Se guardó correctamente con ID #{productoCreadoId} y ya está en MySQL.</p>
                        </div>
                        <div className="admin-success-toast-actions">
                            <Link to={`/producto/${productoCreadoId}`}>
                                <button className="button-primary">Ver detalle</button>
                            </Link>
                            <Link to="/catalogo">
                                <button className="button-secondary">Ir al catálogo</button>
                            </Link>
                            <Link to="/catalogo">
                                <button className="button-secondary">Ver en tienda</button>
                            </Link>
                            <button className="button-secondary" onClick={() => setMostrarToastCreado(false)}>Cerrar</button>
                        </div>
                    </div>
                )}

                <section className="admin-panel-card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Imagen</th>
                                <th>Nombre</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Prioridad</th>
                                <th>Peso</th>
                                <th>Código</th>
                                <th>Categoría</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map(producto => (
                                <tr key={producto.id} className={producto.id === productoCreadoId ? "admin-row-animated row-new" : ""}>
                                    <td>{producto.id}</td>
                                    <td>
                                        <a href={obtenerUrlImagen(producto.imagen)} target="_blank" rel="noreferrer">
                                            <img
                                                src={obtenerUrlImagen(producto.imagen)}
                                                alt={producto.nombre}
                                                className="admin-thumb"
                                            />
                                        </a>
                                    </td>
                                    <td>{producto.nombre}</td>
                                    <td>${producto.precio}</td>
                                    <td>{producto.stock}</td>
                                    <td>{producto.prioridad ?? 0}</td>
                                    <td>{Number(producto.peso || 0).toFixed(2)}</td>
                                    <td>{producto.codigo || "SIN-CODIGO"}</td>
                                    <td>{producto.categoria}</td>
                                    <td className="admin-actions">
                                        <Link to={`/admin/editar/${producto.id}`}>
                                            <button className="button-secondary">Editar</button>
                                        </Link>
                                        <button className="button-danger" onClick={() => eliminar(producto.id)}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </div>
    );
}

export default Productos;