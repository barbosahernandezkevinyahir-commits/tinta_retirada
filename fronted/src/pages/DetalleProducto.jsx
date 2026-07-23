import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useContext } from "react";
import { CarritoContext } from "../context/CarritoContext";

function DetalleProducto() {
    const { id } = useParams();
    const [producto, setProducto] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const { agregarProducto, toggleFavorito, esFavorito } = useContext(CarritoContext);

    useEffect(() => {
        api.get(`/productos/${id}`)
            .then((res) => setProducto(res.data[0] || null))
            .catch(() => setMensaje("No se pudo cargar el producto."));
    }, [id]);

    if (!producto) {
        return (
            <>
                <Navbar />
                <div className="page-content">
                    <div className="cart-card">
                        <p>{mensaje || "Cargando producto..."}</p>
                    </div>
                </div>
            </>
        );
    }

    const imagenUrl = producto.imagen
        ? producto.imagen.startsWith("http")
            ? producto.imagen
            : `http://localhost:5000/uploads/${producto.imagen}`
        : "https://via.placeholder.com/640x480?text=Sin+imagen";

    return (
        <>
            <Navbar />
            <div className="page-content">
                <div className="product-detail-card">
                    <div className="detail-image">
                        <img src={imagenUrl} alt={producto.nombre} />
                    </div>
                    <div className="detail-info">
                        <h1>{producto.nombre}</h1>
                        <p>{producto.descripcion}</p>
                        <p><strong>Precio:</strong> ${Number(producto.precio).toFixed(2)}</p>
                        <p><strong>Stock:</strong> {producto.stock}</p>
                        <p><strong>Categoría:</strong> {producto.categoria || "Sin categoría"}</p>
                        <div className="detail-actions">
                            <button onClick={() => agregarProducto(producto)}>Agregar al carrito</button>
                            <button onClick={() => toggleFavorito(producto)}>
                                {esFavorito(producto.id) ? "♥ Quitar favorito" : "♡ Agregar favorito"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default DetalleProducto;
