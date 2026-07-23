import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";

function Historial() {
    const [pedidos, setPedidos] = useState([]);
    const [mensaje, setMensaje] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        api.get("/pedidos/usuario")
            .then((res) => setPedidos(res.data))
            .catch(() => setMensaje("No se pudo cargar el historial. Inicia sesión nuevamente."));
    }, [navigate]);

    return (
        <>
            <Navbar />
            <div className="page-content">
                <div className="cart-card">
                    <h1>Historial de compras</h1>
                    {mensaje && <p className="form-message">{mensaje}</p>}
                    {pedidos.length === 0 ? (
                        <div className="cart-empty">
                            <p>No hay pedidos registrados.</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {pedidos.map((pedido) => (
                                <div key={pedido.id} className="history-card">
                                    <h2>Pedido #{pedido.id}</h2>
                                    <p>Estado: {pedido.estado}</p>
                                    <p>Total: ${Number(pedido.total).toFixed(2)}</p>
                                    <p>Fecha: {new Date(pedido.fecha_pedido || pedido.created_at || pedido.fecha).toLocaleString()}</p>
                                    <div>
                                        <h3>Productos:</h3>
                                        <ul>
                                            {pedido.productos?.map((item) => (
                                                <li key={item.id || item.producto_id}>
                                                    {item.nombre} x {item.cantidad}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}

export default Historial;
