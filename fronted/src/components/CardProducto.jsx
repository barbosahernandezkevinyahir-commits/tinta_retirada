import "../styles/card.css";
import { useContext } from "react";
import { Link } from "react-router-dom";
import { CarritoContext } from "../context/CarritoContext";

function CardProducto({producto}){
    const { agregarProducto, toggleFavorito, esFavorito } = useContext(CarritoContext);
    const imagenUrl = producto.imagen
        ? producto.imagen.startsWith("http")
            ? producto.imagen
            : `http://localhost:5000/uploads/${producto.imagen}`
        : "https://via.placeholder.com/320x320?text=Sin+imagen";

    return(
        <div className="card">
            <Link to={`/producto/${producto.id}`} className="card-image-link">
                <img
                    src={imagenUrl}
                    alt={producto.nombre}
                />
            </Link>
            <div className="card-meta">
                <h2>{producto.nombre}</h2>
                <p>{producto.descripcion}</p>
                <h3>${Number(producto.precio).toFixed(2)}</h3>
                <p>Stock: {producto.stock}</p>
            </div>
            <div className="card-actions">
                <button onClick={() => agregarProducto(producto)}>
                    Agregar al carrito
                </button>
                <button className="favorite-button" onClick={() => toggleFavorito(producto)}>
                    {esFavorito(producto.id) ? "♥ Favorito" : "♡ Favorito"}
                </button>
            </div>
        </div>

    )

}

export default CardProducto;