import { useState, useEffect } from "react";
import { CarritoContext } from "./CarritoContext.js";

export function CarritoProvider({ children }) {

    const parsePersisted = (datos) => {
        try {
            const lista = JSON.parse(datos);
            return Array.isArray(lista)
                ? lista.map((item) => ({
                    ...item,
                    precio: Number(item.precio) || 0,
                    cantidad: Math.max(1, Number(item.cantidad) || 1),
                    stock: Math.max(0, Number(item.stock) || 0)
                }))
                : [];
        } catch {
            return [];
        }
    };

    const [carrito, setCarrito] = useState(() => {
        const datos = localStorage.getItem("carrito");
        return datos ? parsePersisted(datos) : [];
    });

    const [favoritos, setFavoritos] = useState(() => {
        const datos = localStorage.getItem("favoritos");
        return datos ? parsePersisted(datos) : [];
    });

    useEffect(() => {
        localStorage.setItem("carrito", JSON.stringify(carrito));
    }, [carrito]);

    useEffect(() => {
        localStorage.setItem("favoritos", JSON.stringify(favoritos));
    }, [favoritos]);

    const agregarProducto = (producto) => {
        const stock = Math.max(0, Number(producto.stock) || 0);
        const precio = Number(producto.precio) || 0;

        setCarrito((prev) => {
            const existe = prev.find((p) => p.id === producto.id);

            if (!existe) {
                if (stock === 0) {
                    return prev;
                }
                return [
                    ...prev,
                    { ...producto, precio, stock, cantidad: 1 }
                ];
            }

            return prev.map((p) => {
                if (p.id !== producto.id) {
                    return p;
                }
                const siguienteCantidad = p.cantidad + 1;
                return {
                    ...p,
                    precio,
                    stock,
                    cantidad: stock > 0 ? Math.min(siguienteCantidad, stock) : siguienteCantidad
                };
            });
        });
    };

    const eliminarProducto = (id) => {
        setCarrito((prev) => prev.filter((p) => p.id !== id));
    };

    const aumentarCantidad = (id) => {
        setCarrito((prev) =>
            prev.map((p) => {
                if (p.id !== id) {
                    return p;
                }
                const stock = Math.max(0, Number(p.stock) || 0);
                const siguienteCantidad = p.cantidad + 1;
                return {
                    ...p,
                    cantidad: stock > 0 ? Math.min(siguienteCantidad, stock) : siguienteCantidad
                };
            })
        );
    };

    const disminuirCantidad = (id) => {
        setCarrito((prev) =>
            prev
                .map((p) =>
                    p.id === id
                        ? { ...p, cantidad: p.cantidad - 1 }
                        : p
                )
                .filter((p) => p.cantidad > 0)
        );
    };

    const toggleFavorito = (producto) => {
        setFavoritos((prev) => {
            const existe = prev.find((p) => p.id === producto.id);
            if (existe) {
                return prev.filter((p) => p.id !== producto.id);
            }
            return [...prev, producto];
        });
    };

    const esFavorito = (id) => favoritos.some(p => p.id === id);

    const vaciarCarrito = () => {
        setCarrito([]);
        localStorage.removeItem("carrito");
    };

    const total = carrito.reduce(
        (acumulado, producto) =>
            acumulado + (Number(producto.precio) || 0) * (Number(producto.cantidad) || 0),
        0
    );

    return (
        <CarritoContext.Provider
            value={{
                carrito,
                agregarProducto,
                eliminarProducto,
                aumentarCantidad,
                disminuirCantidad,
                vaciarCarrito,
                total,
                favoritos,
                toggleFavorito,
                esFavorito
            }}
        >
            {children}
        </CarritoContext.Provider>
    );

}