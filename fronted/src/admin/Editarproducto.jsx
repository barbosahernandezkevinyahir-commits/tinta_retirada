import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import Sidebar from "./Sidebar";

function EditarProducto() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [precio, setPrecio] = useState("");
    const [stock, setStock] = useState(1);
    const [prioridad, setPrioridad] = useState(0);
    const [peso, setPeso] = useState(0);
    const [codigo, setCodigo] = useState("SIN-CODIGO");
    const [imagen, setImagen] = useState("");
    const [categoriaId, setCategoriaId] = useState(1);
    const [categorias, setCategorias] = useState([{ id: 1, nombre: "General" }]);
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        api.get(`/productos/${id}`)
            .then((res) => {
                const producto = res.data[0];
                if (producto) {
                    setNombre(producto.nombre || "");
                    setDescripcion(producto.descripcion || "");
                    setPrecio(producto.precio || "");
                    setStock(producto.stock || 1);
                    setPrioridad(producto.prioridad || 0);
                    setPeso(producto.peso || 0);
                    setCodigo(producto.codigo || "SIN-CODIGO");
                    setImagen(producto.imagen || "");
                    setCategoriaId(producto.categoria_id || 1);
                }
            })
            .catch((error) => {
                console.error(error);
                setMensaje("No se pudo cargar el producto.");
            });
    }, [id]);

    useEffect(() => {
        api.get("/productos/categorias")
            .then((res) => {
                const categoriasDisponibles = Array.isArray(res.data)
                    ? res.data.map((categoria) => ({
                        id: Number(categoria.id),
                        nombre: String(categoria.nombre || "General")
                    })).filter((categoria) => !Number.isNaN(categoria.id))
                    : [];

                if (categoriasDisponibles.length > 0) {
                    setCategorias(categoriasDisponibles);
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }, []);

    const subirImagen = async (archivo) => {
        if (!archivo) return;
        const formData = new FormData();
        formData.append("imagen", archivo);

        try {
            const respuesta = await api.post("/productos/imagen", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setImagen(respuesta.data.nombreArchivo);
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo cargar la imagen. Intente de nuevo.");
        }
    };

    const guardar = async () => {
        if (!nombre || !descripcion || !precio || !imagen) {
            setMensaje("Complete los campos obligatorios antes de guardar.");
            return;
        }

        const precioNumero = Number(precio);
        const stockNumero = Number(stock);
        const prioridadNumero = Number(prioridad);
        const pesoNumero = Number(peso);
        const categoriaNumero = Number(categoriaId);
        const codigoTexto = String(codigo || "").trim() || "SIN-CODIGO";

        if (Number.isNaN(precioNumero) || precioNumero <= 0) {
            setMensaje("El precio debe ser mayor a 0.");
            return;
        }

        if (Number.isNaN(stockNumero) || stockNumero < 0) {
            setMensaje("El stock no puede ser negativo.");
            return;
        }

        if (Number.isNaN(prioridadNumero) || prioridadNumero < 0) {
            setMensaje("La prioridad debe ser mayor o igual a 0.");
            return;
        }

        if (Number.isNaN(pesoNumero) || pesoNumero < 0) {
            setMensaje("El peso debe ser mayor o igual a 0.");
            return;
        }

        if (Number.isNaN(categoriaNumero) || categoriaNumero <= 0) {
            setMensaje("Selecciona una categoría válida.");
            return;
        }

        if (codigoTexto.length > 12) {
            setMensaje("El código no puede superar 12 caracteres.");
            return;
        }

        try {
            await api.put(`/productos/${id}`, {
                nombre,
                descripcion,
                precio: precioNumero,
                stock: stockNumero,
                prioridad: prioridadNumero,
                peso: pesoNumero,
                codigo: codigoTexto,
                imagen,
                categoria_id: categoriaNumero
            });

            alert("Producto actualizado correctamente.");
            navigate("/admin/productos");
        } catch (error) {
            console.error(error);
            setMensaje("Error al actualizar el producto.");
        }
    };

    const imagenUrl = imagen
        ? imagen.startsWith("http")
            ? imagen
            : `http://localhost:5000/uploads/${imagen}`
        : "https://via.placeholder.com/640x480?text=Selecciona+una+imagen";

    return (
        <div className="admin-container">
            <Sidebar />
            <main className="admin-content">
                <div className="admin-page-header">
                    <div>
                        <p className="admin-overline">Catálogo</p>
                        <h1>Editar producto</h1>
                        <p className="admin-intro">Modifica la información del artículo para mantener el inventario perfecto.</p>
                    </div>
                    <Link to="/admin/productos">
                        <button className="button-secondary">Volver</button>
                    </Link>
                </div>

                <section className="admin-panel-card form-panel">
                    {mensaje && <p className="form-message">{mensaje}</p>}
                    <input
                        placeholder="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                    <input
                        placeholder="Descripción"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Precio"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Stock"
                        value={stock}
                        min="0"
                        onChange={(e) => setStock(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Prioridad (INT)"
                        value={prioridad}
                        min="0"
                        onChange={(e) => setPrioridad(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Peso (FLOAT)"
                        value={peso}
                        min="0"
                        step="0.01"
                        onChange={(e) => setPeso(e.target.value)}
                    />
                    <input
                        placeholder="Código (CHAR 12)"
                        value={codigo}
                        maxLength={12}
                        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    />
                    <label className="file-upload-label">
                        Imagen del producto
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => subirImagen(e.target.files[0])}
                        />
                    </label>
                    <div className="image-preview">
                        <img src={imagenUrl} alt="Vista previa" />
                    </div>
                    <select
                        value={categoriaId}
                        onChange={(e) => setCategoriaId(e.target.value)}
                    >
                        {categorias.map((categoria) => (
                            <option key={categoria.id} value={categoria.id}>
                                {categoria.nombre} (ID {categoria.id})
                            </option>
                        ))}
                    </select>
                    <button className="button-primary" onClick={guardar}>Guardar cambios</button>
                </section>
            </main>
        </div>
    );
}

export default EditarProducto;