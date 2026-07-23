import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CardProducto from "../components/CardProducto";

function Catalogo() {
    const [productos, setProductos] = useState([]);
    const [buscar, setBuscar] = useState("");
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");

    useEffect(() => {
        api.get("/productos")
            .then(res => setProductos(res.data))
            .catch(console.error);
    }, []);

    const categorias = ["Todas", ...new Set(productos.map(p => p.categoria || "Sin categoría"))];

    const filtrados = productos.filter(producto => {
        const nombreMatch = producto.nombre.toLowerCase().includes(buscar.toLowerCase());
        const categoriaMatch =
            categoriaSeleccionada === "Todas" ||
            producto.categoria === categoriaSeleccionada;
        return nombreMatch && categoriaMatch;
    });

    return (
        <>
            <Navbar />
            <div className="busqueda">
                <input
                    type="text"
                    placeholder="Buscar producto"
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                />
                <select
                    value={categoriaSeleccionada}
                    onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                >
                    {categorias.map((categoria) => (
                        <option key={categoria} value={categoria}>
                            {categoria}
                        </option>
                    ))}
                </select>
            </div>
            <div className="catalogo">
                {filtrados.map(producto => (
                    <CardProducto key={producto.id} producto={producto} />
                ))}
            </div>
            <Footer />
        </>
    );
}

export default Catalogo;
