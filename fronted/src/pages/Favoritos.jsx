import { useContext } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CarritoContext } from "../context/CarritoContext";
import CardProducto from "../components/CardProducto";

function Favoritos() {
    const { favoritos } = useContext(CarritoContext);

    return (
        <>
            <Navbar />
            <div className="page-content">
                <div className="cart-card">
                    <h1>Favoritos</h1>
                    {favoritos.length === 0 ? (
                        <div className="cart-empty">
                            <p>No tienes productos favoritos todavía.</p>
                            <p>Agrega favoritos desde el catálogo para verlos aquí.</p>
                        </div>
                    ) : (
                        <div className="card-grid">
                            {favoritos.map(producto => (
                                <CardProducto key={producto.id} producto={producto} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}

export default Favoritos;
