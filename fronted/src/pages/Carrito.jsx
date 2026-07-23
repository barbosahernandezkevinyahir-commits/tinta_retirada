import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { CarritoContext } from "../context/CarritoContext";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Carrito() {

    const {
        carrito,
        aumentarCantidad,
        disminuirCantidad,
        eliminarProducto,
        vaciarCarrito,
        total
    } = useContext(CarritoContext);

    const [direccion, setDireccion] = useState("");
    const [correoConfirmacion, setCorreoConfirmacion] = useState(() => {
        try {
            const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
            return usuario?.correo || "";
        } catch {
            return "";
        }
    });
    const [mensaje, setMensaje] = useState("");
    const [procesando, setProcesando] = useState(false);
    const [confirmarCorreo, setConfirmarCorreo] = useState(false);
    const [resumenCompra, setResumenCompra] = useState(null);

    const finalizarCompra = async () => {
        if (procesando) {
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            setMensaje("Debes iniciar sesión para finalizar la compra.");
            return;
        }

        if (carrito.length === 0) {
            setMensaje("No hay productos en el carrito.");
            return;
        }

        if (!correoConfirmacion.trim()) {
            setMensaje("Debes ingresar un correo electrónico para recibir la confirmación de compra.");
            return;
        }

        if (!confirmarCorreo) {
            setMensaje("Debes confirmar que el correo electrónico es correcto antes de finalizar la compra.");
            return;
        }

        try {
            setProcesando(true);
            setMensaje("");
            setResumenCompra(null);
            const respuesta = await api.post("/pedidos/crear", {
                items: carrito,
                total,
                direccion: direccion || "Recoger en tienda",
                correoConfirmacion: correoConfirmacion.trim()
            });
            const pedidoId = Number(respuesta.data?.pedidoId || 0);
            const totalCompra = Number(respuesta.data?.total || total);
            const correoEnviado = Boolean(respuesta.data?.correoEnviado);

            setResumenCompra({
                pedidoId,
                total: totalCompra,
                correo: correoConfirmacion.trim(),
                correoEnviado,
                fecha: new Date().toLocaleString()
            });

            vaciarCarrito();
            setDireccion("");
            setConfirmarCorreo(false);
            const textoPedido = pedidoId > 0 ? ` Pedido #${pedidoId}.` : "";
            if (correoEnviado) {
                setMensaje(`Compra realizada con éxito.${textoPedido} Te enviamos un correo de confirmación.`);
            } else {
                setMensaje(`Compra realizada con éxito.${textoPedido} No fue posible enviar el correo de confirmación.`);
            }
        } catch (error) {
            console.error(error);
            const mensajeApi = error?.response?.data?.mensaje;
            setResumenCompra(null);
            setMensaje(mensajeApi || "Error al procesar el pedido. Inicia sesión y vuelve a intentarlo.");
        } finally {
            setProcesando(false);
        }
    };

    const obtenerUrlImagen = (imagen) =>
        imagen
            ? imagen.startsWith("http")
                ? imagen
                : `http://localhost:5000/uploads/${imagen}`
            : "https://via.placeholder.com/120x120?text=Sin+imagen";

    const cantidadProductos = carrito.reduce((acumulado, producto) => acumulado + Number(producto.cantidad || 0), 0);

    return (
        <>
            <Navbar />
            <div className="page-content">
                <div className="cart-card">
                    <h1>Carrito de Compras</h1>
                    <div className="cart-top-actions">
                        <Link to="/catalogo" className="button-secondary">Seguir comprando</Link>
                        <Link to="/catalogo" className="button-secondary">Regresar a la tienda</Link>
                        <Link to="/" className="button-secondary">Volver al inicio</Link>
                    </div>
                    {mensaje && <p className="form-message">{mensaje}</p>}
                    {resumenCompra && (
                        <div className="checkout-ticket" role="status" aria-live="polite">
                            <h3>Compra confirmada</h3>
                            <p><strong>Pedido:</strong> #{resumenCompra.pedidoId || "-"}</p>
                            <p><strong>Total pagado:</strong> ${Number(resumenCompra.total || 0).toFixed(2)}</p>
                            <p><strong>Correo destino:</strong> {resumenCompra.correo}</p>
                            <p><strong>Fecha:</strong> {resumenCompra.fecha}</p>
                            <p>
                                <strong>Estado del correo:</strong> {resumenCompra.correoEnviado ? "Enviado" : "No enviado"}
                            </p>
                        </div>
                    )}
                    {carrito.length === 0 ? (
                        <div className="cart-empty">
                            <p>No hay productos en el carrito.</p>
                            <p>Agrega productos desde el catálogo para continuar.</p>
                            <Link to="/catalogo" className="button-secondary cart-empty-link">Ir al catálogo</Link>
                        </div>
                    ) : (
                        <>
                            <table className="cart-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Precio</th>
                                        <th>Cantidad</th>
                                        <th>Subtotal</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {carrito.map(producto => {
                                        const precioNum = Number(producto.precio);
                                        const stockNum = Number(producto.stock) || 0;
                                        const sinStock = stockNum > 0 && producto.cantidad >= stockNum;
                                        return (
                                            <tr key={producto.id}>
                                                <td className="cart-product-cell">
                                                    <img
                                                        src={obtenerUrlImagen(producto.imagen)}
                                                        alt={producto.nombre}
                                                        className="cart-thumbnail"
                                                    />
                                                    <div className="cart-product-meta">
                                                        <span>{producto.nombre}</span>
                                                        <small>Stock disponible: {stockNum}</small>
                                                    </div>
                                                </td>
                                                <td>${precioNum.toFixed(2)}</td>
                                                <td>{producto.cantidad}</td>
                                                <td>${(precioNum * producto.cantidad).toFixed(2)}</td>
                                                <td className="cart-actions">
                                                    <button
                                                        onClick={() => aumentarCantidad(producto.id)}
                                                        disabled={sinStock}
                                                        title={sinStock ? "Stock máximo alcanzado" : "Aumentar cantidad"}
                                                    >+
                                                    </button>
                                                    <button onClick={() => disminuirCantidad(producto.id)}>-</button>
                                                    <button onClick={() => eliminarProducto(producto.id)}>Eliminar</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="checkout-form">
                                <label>
                                    Correo electrónico para confirmación:
                                    <input
                                        type="email"
                                        value={correoConfirmacion}
                                        placeholder="ejemplo@correo.com"
                                        onChange={(e) => setCorreoConfirmacion(e.target.value)}
                                    />
                                </label>
                                <label>
                                    Dirección de envío / comentarios:
                                    <input
                                        type="text"
                                        value={direccion}
                                        placeholder="Ej. Calle Falsa 123"
                                        onChange={(e) => setDireccion(e.target.value)}
                                    />
                                </label>

                                <div className="checkout-summary" role="status" aria-live="polite">
                                    <h3>Resumen de confirmación</h3>
                                    <p><strong>Correo destino:</strong> {correoConfirmacion || "Pendiente por ingresar"}</p>
                                    <p><strong>Productos totales:</strong> {cantidadProductos}</p>
                                    <p><strong>Monto a pagar:</strong> ${total.toFixed(2)}</p>
                                </div>

                                <label className="checkout-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={confirmarCorreo}
                                        onChange={(e) => setConfirmarCorreo(e.target.checked)}
                                    />
                                    Confirmo que mi correo es correcto y recibiré ahí el resumen de compra.
                                </label>
                            </div>
                            <div className="cart-total">
                                <h2>Total: ${total.toFixed(2)}</h2>
                                <button onClick={finalizarCompra} disabled={procesando || !confirmarCorreo}>
                                    {procesando ? "Procesando..." : "Finalizar compra"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}

export default Carrito;
