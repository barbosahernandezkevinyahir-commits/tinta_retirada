import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Sidebar from "./Sidebar";

function AgregarProducto() {
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
    const [subiendoImagen, setSubiendoImagen] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const cargarCategorias = async () => {
            try {
                const respuesta = await api.get("/productos/categorias");
                const categoriasDisponibles = Array.isArray(respuesta.data)
                    ? respuesta.data.map((categoria) => ({
                        id: Number(categoria.id),
                        nombre: String(categoria.nombre || "General")
                    })).filter((categoria) => !Number.isNaN(categoria.id))
                    : [];

                if (categoriasDisponibles.length > 0) {
                    setCategorias(categoriasDisponibles);
                    setCategoriaId(categoriasDisponibles[0].id);
                }
            } catch (error) {
                console.error(error);
            }
        };

        cargarCategorias();
    }, []);

    const subirImagen = async (archivo) => {
        if (!archivo) return;

        if (!archivo.type.startsWith("image/")) {
            setMensaje("Selecciona un archivo de imagen válido.");
            return;
        }

        if (archivo.size > 5 * 1024 * 1024) {
            setMensaje("La imagen no debe superar 5MB.");
            return;
        }

        const formData = new FormData();
        formData.append("imagen", archivo);

        try {
            setMensaje("");
            setSubiendoImagen(true);
            const respuesta = await api.post("/productos/imagen", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setImagen(respuesta.data.nombreArchivo);
        } catch (error) {
            console.error(error);
            setMensaje("No se pudo cargar la imagen. Intente de nuevo.");
        } finally {
            setSubiendoImagen(false);
        }
    };

    const guardar = async () => {
        if (!nombre || !precio) {
            setMensaje("Completa al menos nombre y precio antes de guardar.");
            return;
        }

        const precioNumero = Number(precio);
        const stockNumero = Number(stock);
        const categoriaNumero = Number(categoriaId);
        const prioridadNumero = Number(prioridad);
        const pesoNumero = Number(peso);
        const codigoTexto = String(codigo || "").trim() || "SIN-CODIGO";

        if (Number.isNaN(precioNumero) || precioNumero <= 0) {
            setMensaje("El precio debe ser mayor a 0.");
            return;
        }

        if (Number.isNaN(stockNumero) || stockNumero < 0) {
            setMensaje("El stock no puede ser negativo.");
            return;
        }

        if (Number.isNaN(categoriaNumero) || categoriaNumero <= 0) {
            setMensaje("Selecciona una categoría válida.");
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

        if (codigoTexto.length > 12) {
            setMensaje("El código no puede superar 12 caracteres.");
            return;
        }

        try {
            setMensaje("");
            setGuardando(true);
            const respuesta = await api.post("/productos", {
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

            setMensaje("Producto agregado correctamente. Redirigiendo...");
            const idCreado = respuesta.data?.id;
            navigate(`/admin/productos${idCreado ? `?creado=${idCreado}` : ""}`);
        } catch (error) {
            console.error(error);
            const status = Number(error?.response?.status || 0);
            if (status === 401 || status === 403) {
                setMensaje("Tu sesión de administrador no es válida. Inicia sesión de nuevo.");
            } else {
                setMensaje(error.response?.data?.mensaje || "Error al guardar el producto. Intente de nuevo.");
            }
        } finally {
            setGuardando(false);
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
                        <h1>Nuevo producto</h1>
                        <p className="admin-intro">Registra nuevos artículos con información clara y atractiva.</p>
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
                        min="0"
                        step="0.01"
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
                    <input
                        placeholder="O pega una URL de imagen (opcional)"
                        value={imagen}
                        onChange={(e) => setImagen(e.target.value.trim())}
                    />
                    {subiendoImagen && <p className="info-text">Subiendo imagen...</p>}
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
                    <button className="button-primary" onClick={guardar} disabled={guardando || subiendoImagen}>
                        {guardando ? "Guardando..." : "Guardar producto"}
                    </button>
                </section>
            </main>
        </div>
    );
}

export default AgregarProducto;