const mysql = require("mysql2");
const nodemailer = require("nodemailer");
const conexion = require("../config/db");

const crearTransport = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_HOST) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const enviarCorreo = async (destinatario, asunto, html) => {
    const transport = crearTransport();
    if (!transport) {
        console.log("No hay configuración de correo válida para enviar confirmaciones.");
        return false;
    }

    try {
        const envio = transport.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: destinatario,
            subject: asunto,
            html
        });

        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Tiempo de espera agotado al enviar correo")), 12000);
        });

        await Promise.race([envio, timeout]);
        return true;
    } catch (error) {
        console.error("Error enviando correo de confirmación:", error);
        return false;
    }
};

const obtenerColumnaFechaPedidos = (callback) => {
    conexion.query("SHOW COLUMNS FROM pedidos", (error, columnas) => {
        if (error) {
            return callback(null);
        }

        const nombres = Array.isArray(columnas)
            ? columnas.map((columna) => String(columna.Field).toLowerCase())
            : [];

        if (nombres.includes("created_at")) {
            return callback("created_at");
        }

        if (nombres.includes("fecha")) {
            return callback("fecha");
        }

        return callback(null);
    });
};

exports.crearPedido = (req, res) => {
    const userId = req.user.id;
    const { items, total, direccion, correoConfirmacion } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: "El carrito no puede estar vacío." });
    }

    const correoDestino = String(correoConfirmacion || "").trim();

    if (!correoDestino) {
        return res.status(400).json({ mensaje: "Debes ingresar un correo para recibir la confirmación." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoDestino)) {
        return res.status(400).json({ mensaje: "El correo ingresado no es válido." });
    }

    const itemsNormalizados = items.map((item) => ({
        id: Number(item.id),
        cantidad: Number(item.cantidad)
    }));

    const itemsValidos = itemsNormalizados.every(
        (item) => Number.isFinite(item.id) && Number.isFinite(item.cantidad) && item.cantidad > 0
    );

    if (!itemsValidos) {
        return res.status(400).json({ mensaje: "Hay productos o cantidades inválidas en el carrito." });
    }

    const cantidadesPorProducto = new Map();
    itemsNormalizados.forEach((item) => {
        const acumulado = cantidadesPorProducto.get(item.id) || 0;
        cantidadesPorProducto.set(item.id, acumulado + item.cantidad);
    });

    const idsProductos = Array.from(cantidadesPorProducto.keys());
    if (idsProductos.length === 0) {
        return res.status(400).json({ mensaje: "Hay productos inválidos en el carrito." });
    }

    const placeholders = idsProductos.map(() => "?").join(",");
    conexion.beginTransaction((txError) => {
        if (txError) {
            return res.status(500).json(txError);
        }

        const rollback = (error, status = 500) =>
            conexion.rollback(() => res.status(status).json(error));

        conexion.query(
            `SELECT id, nombre, precio, stock FROM productos WHERE id IN (${placeholders}) FOR UPDATE`,
            idsProductos,
            (productosError, productosRows) => {
                if (productosError) {
                    return rollback(productosError);
                }

                const productosMap = new Map((productosRows || []).map((row) => [Number(row.id), row]));
                const todosValidos = idsProductos.every((id) => productosMap.has(id));

                if (!todosValidos) {
                    return rollback(
                        { mensaje: "Algunos productos del carrito ya no existen. Actualiza tu carrito e intenta de nuevo." },
                        400
                    );
                }

                const stockInsuficiente = idsProductos.find((id) => {
                    const stockActual = Number(productosMap.get(id)?.stock || 0);
                    return cantidadesPorProducto.get(id) > stockActual;
                });

                if (stockInsuficiente) {
                    const producto = productosMap.get(stockInsuficiente);
                    return rollback(
                        {
                            mensaje: `Stock insuficiente para ${producto?.nombre || `ID ${stockInsuficiente}`}. Actualiza tu carrito.`
                        },
                        400
                    );
                }

                const pedidoTotalCalculado = itemsNormalizados.reduce((acumulado, item) => {
                    const producto = productosMap.get(item.id);
                    return acumulado + Number(producto?.precio || 0) * item.cantidad;
                }, 0);

                const totalCliente = Number(total);
                if (Number.isFinite(totalCliente) && Math.abs(totalCliente - pedidoTotalCalculado) > 0.01) {
                    return rollback(
                        { mensaje: "El total del pedido cambió. Actualiza tu carrito e intenta de nuevo." },
                        400
                    );
                }

                conexion.query("SHOW COLUMNS FROM pedidos", (schemaError, columnasPedidos) => {
                    if (schemaError) {
                        return rollback(schemaError);
                    }

                    const campos = Array.isArray(columnasPedidos)
                        ? columnasPedidos.map((columna) => String(columna.Field).toLowerCase())
                        : [];

                    const columnasInsert = ["usuario_id", "total", "estado"];
                    const valoresInsert = [userId, pedidoTotalCalculado, "Pendiente"];

                    if (campos.includes("direccion")) {
                        columnasInsert.push("direccion");
                        valoresInsert.push(direccion || "Recoger en tienda");
                    }

                    if (campos.includes("created_at")) {
                        columnasInsert.push("created_at");
                    }

                    const insertPlaceholders = columnasInsert
                        .map((columna) => (columna === "created_at" ? "NOW()" : "?"))
                        .join(", ");
                    const sqlInsertPedido = `INSERT INTO pedidos(${columnasInsert.join(", ")}) VALUES (${insertPlaceholders})`;

                    conexion.query(sqlInsertPedido, valoresInsert, (insertPedidoError, resultado) => {
                        if (insertPedidoError) {
                            return rollback(insertPedidoError);
                        }

                        const pedidoId = resultado.insertId;
                        const columnasCompra = ["pedido_id", "usuario_id", "correo", "direccion", "total", "estado", "correo_enviado"];
                        const sqlInsertCompra = `INSERT INTO compras(${columnasCompra.join(", ")}) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                        const valoresCompra = [
                            pedidoId,
                            userId,
                            correoDestino,
                            direccion || "Recoger en tienda",
                            pedidoTotalCalculado,
                            "Pendiente",
                            0
                        ];

                        conexion.query(sqlInsertCompra, valoresCompra, (insertCompraError, compraResultado) => {
                            if (insertCompraError) {
                                return rollback(insertCompraError);
                            }

                            const compraId = compraResultado.insertId;
                        const valoresDetalle = itemsNormalizados.map((item) => {
                            const producto = productosMap.get(item.id);
                            return [pedidoId, item.id, item.cantidad, Number(producto?.precio || 0)];
                        });

                        conexion.query(
                            "INSERT INTO pedidos_productos(pedido_id, producto_id, cantidad, precio) VALUES ?",
                            [valoresDetalle],
                            (insertDetalleError) => {
                                if (insertDetalleError) {
                                    return rollback(insertDetalleError);
                                }

                                const actualizarStock = (index) => {
                                    if (index >= idsProductos.length) {
                                        const finalizarCompra = async () => {
                                            try {
                                                const nombreUsuario = req.user.nombre || "cliente";
                                                const detallesCorreo = itemsNormalizados
                                                    .map((item) => {
                                                        const producto = productosMap.get(item.id);
                                                        const precioProducto = Number(producto?.precio || 0);
                                                        return `<li>${producto?.nombre || item.id} x ${item.cantidad} - $${(precioProducto * item.cantidad).toFixed(2)}</li>`;
                                                    })
                                                    .join("");

                                                const correoEnviado = await enviarCorreo(
                                                    correoDestino,
                                                    "Compra realizada con éxito - Tinta Retirada",
                                                    `<h2>Pedido #${pedidoId} confirmado</h2><p>Hola ${nombreUsuario},</p><p>Tu compra fue realizada con éxito. Hemos registrado tu pedido con un total de <strong>$${pedidoTotalCalculado.toFixed(2)}</strong>.</p><p>Detalle:</p><ul>${detallesCorreo}</ul><p>Correo de confirmación enviado a: <strong>${correoDestino}</strong></p><p>Gracias por comprar en Tinta Retirada.</p>`
                                                );

                                                if (!correoEnviado) {
                                                    return rollback(
                                                        { mensaje: "No se pudo enviar el correo de confirmación. Intenta nuevamente en unos minutos." },
                                                        502
                                                    );
                                                }

                                                conexion.query(
                                                    "UPDATE compras SET correo_enviado = 1, estado = ? WHERE id = ?",
                                                    ["Confirmada", compraId],
                                                    (updateCompraError) => {
                                                        if (updateCompraError) {
                                                            return rollback(updateCompraError);
                                                        }

                                                        conexion.commit((commitError) => {
                                                            if (commitError) {
                                                                return rollback(commitError);
                                                            }

                                                            return res.status(201).json({
                                                                mensaje: "Pedido creado correctamente.",
                                                                pedidoId,
                                                                compraId,
                                                                total: Number(pedidoTotalCalculado.toFixed(2)),
                                                                correoEnviado: true
                                                            });
                                                        });
                                                    }
                                                );
                                            } catch (finalizarError) {
                                                console.error("Error al finalizar compra:", finalizarError);
                                                return rollback(
                                                    { mensaje: "Error inesperado al finalizar el pedido. Intenta nuevamente." },
                                                    500
                                                );
                                            }
                                        };

                                        finalizarCompra();
                                        return;
                                    }

                                    const productoId = idsProductos[index];
                                    const cantidadSolicitada = cantidadesPorProducto.get(productoId) || 0;
                                    conexion.query(
                                        "UPDATE productos SET stock = stock - ? WHERE id = ?",
                                        [cantidadSolicitada, productoId],
                                        (stockError) => {
                                            if (stockError) {
                                                return rollback(stockError);
                                            }
                                            actualizarStock(index + 1);
                                        }
                                    );
                                };

                                actualizarStock(0);
                            }
                        );
                        });
                    });
                });
            }
        );
    });
};

const agruparItems = (pedidos, items) => {
    return pedidos.map(pedido => ({
        ...pedido,
        productos: items.filter(item => item.pedido_id === pedido.id)
    }));
};

exports.obtenerPedidosUsuario = (req, res) => {
    const userId = req.user.id;

    obtenerColumnaFechaPedidos((columnaFecha) => {
        const fechaSelect = columnaFecha ? `, p.${columnaFecha} AS fecha_pedido` : "";
        const orderBy = columnaFecha
            ? ` ORDER BY p.${columnaFecha} DESC, p.id DESC`
            : " ORDER BY p.id DESC";

        const sqlPedidos = `SELECT p.*${fechaSelect} FROM pedidos p WHERE p.usuario_id = ?${orderBy}`;

        conexion.query(sqlPedidos, [userId], (error, pedidos) => {
            if (error) {
                return res.status(500).json(error);
            }

            if (pedidos.length === 0) {
                return res.json([]);
            }

            const ids = pedidos.map(pedido => pedido.id);
            conexion.query(
                `SELECT pp.*, p.nombre, p.imagen FROM pedidos_productos pp JOIN productos p ON pp.producto_id = p.id WHERE pp.pedido_id IN (${ids.map(() => "?").join(",")})`,
                ids,
                (error, items) => {
                    if (error) {
                        return res.status(500).json(error);
                    }
                    res.json(agruparItems(pedidos, items));
                }
            );
        });
    });
};

exports.obtenerPedidosAdmin = (req, res) => {
    obtenerColumnaFechaPedidos((columnaFecha) => {
        const fechaSelect = columnaFecha ? `, p.${columnaFecha} AS fecha_pedido` : "";
        const orderBy = columnaFecha
            ? ` ORDER BY p.${columnaFecha} DESC, p.id DESC`
            : " ORDER BY p.id DESC";

        const sqlPedidos = `SELECT p.*${fechaSelect}, u.nombre AS usuario_nombre, u.correo AS usuario_correo
         FROM pedidos p
         JOIN usuarios u ON p.usuario_id = u.id${orderBy}`;

        conexion.query(sqlPedidos, (error, pedidos) => {
            if (error) {
                return res.status(500).json(error);
            }

            if (pedidos.length === 0) {
                return res.json([]);
            }

            const ids = pedidos.map(pedido => pedido.id);
            conexion.query(
                `SELECT pp.*, p.nombre FROM pedidos_productos pp JOIN productos p ON pp.producto_id = p.id WHERE pp.pedido_id IN (${ids.map(() => "?").join(",")})`,
                ids,
                (error, items) => {
                    if (error) {
                        return res.status(500).json(error);
                    }
                    res.json(agruparItems(pedidos, items));
                }
            );
        });
    });
};

exports.actualizarEstado = (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    conexion.query(
        "UPDATE pedidos SET estado = ? WHERE id = ?",
        [estado || "Pendiente", id],
        (error) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json({ mensaje: "Estado del pedido actualizado." });
        }
    );
};

exports.actualizarTiposPedido = (req, res) => {
    const { id } = req.params;
    const { prioridad_int, recargo_float, canal_char } = req.body;

    const prioridad = Number(prioridad_int);
    const recargo = Number(recargo_float);
    const canal = String(canal_char || "WEB").trim() || "WEB";

    if (!Number.isFinite(prioridad) || prioridad < 0) {
        return res.status(400).json({ mensaje: "prioridad_int debe ser mayor o igual a 0." });
    }

    if (!Number.isFinite(recargo) || recargo < 0) {
        return res.status(400).json({ mensaje: "recargo_float debe ser mayor o igual a 0." });
    }

    if (canal.length > 10) {
        return res.status(400).json({ mensaje: "canal_char no puede superar 10 caracteres." });
    }

    conexion.query(
        "UPDATE pedidos SET prioridad_int = ?, recargo_float = ?, canal_char = ? WHERE id = ?",
        [prioridad, recargo, canal, id],
        (error) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json({ mensaje: "Tipos de datos de pedido actualizados." });
        }
    );
};

exports.obtenerPedidosProductosAdmin = (req, res) => {
    const sql = `SELECT pp.id, pp.pedido_id, pp.producto_id, pp.cantidad, pp.precio, pp.created_at, pp.updated_at,
        COALESCE(pp.lote_int, 0) AS lote_int,
        COALESCE(pp.impuesto_float, 0) AS impuesto_float,
        COALESCE(pp.marca_char, 'PP-BASE') AS marca_char,
        p.nombre AS producto_nombre
    FROM pedidos_productos pp
    LEFT JOIN productos p ON pp.producto_id = p.id
    ORDER BY pp.id DESC`;

    conexion.query(sql, (error, rows) => {
        if (error) {
            return res.status(500).json(error);
        }
        res.json(rows || []);
    });
};

exports.actualizarTiposPedidoProducto = (req, res) => {
    const { id } = req.params;
    const { lote_int, impuesto_float, marca_char } = req.body;

    const lote = Number(lote_int);
    const impuesto = Number(impuesto_float);
    const marca = String(marca_char || "PP-BASE").trim() || "PP-BASE";

    if (!Number.isFinite(lote) || lote < 0) {
        return res.status(400).json({ mensaje: "lote_int debe ser mayor o igual a 0." });
    }

    if (!Number.isFinite(impuesto) || impuesto < 0) {
        return res.status(400).json({ mensaje: "impuesto_float debe ser mayor o igual a 0." });
    }

    if (marca.length > 10) {
        return res.status(400).json({ mensaje: "marca_char no puede superar 10 caracteres." });
    }

    conexion.query(
        "UPDATE pedidos_productos SET lote_int = ?, impuesto_float = ?, marca_char = ? WHERE id = ?",
        [lote, impuesto, marca, id],
        (error) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json({ mensaje: "Tipos de datos de detalle de pedido actualizados." });
        }
    );
};

exports.obtenerComprasAdmin = (req, res) => {
    const sql = `SELECT c.id, c.pedido_id, c.usuario_id, c.correo, c.direccion, c.total, c.estado,
        c.correo_enviado, c.created_at, c.updated_at,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo
    FROM compras c
    JOIN usuarios u ON c.usuario_id = u.id
    ORDER BY c.id DESC`;

    conexion.query(sql, (error, rows) => {
        if (error) {
            return res.status(500).json(error);
        }
        res.json(rows || []);
    });
};

exports.actualizarCompraAdmin = (req, res) => {
    const { id } = req.params;
    const { correo, direccion, total, estado, correo_enviado } = req.body;

    const correoTexto = String(correo || "").trim();
    const direccionTexto = String(direccion || "").trim();
    const estadoTexto = String(estado || "Pendiente").trim() || "Pendiente";
    const totalNumero = Number(total);
    const correoEnviadoNumero = Number(Boolean(correo_enviado));

    if (!correoTexto) {
        return res.status(400).json({ mensaje: "El correo es obligatorio." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoTexto)) {
        return res.status(400).json({ mensaje: "El correo ingresado no es válido." });
    }

    if (!direccionTexto) {
        return res.status(400).json({ mensaje: "La dirección es obligatoria." });
    }

    if (!Number.isFinite(totalNumero) || totalNumero < 0) {
        return res.status(400).json({ mensaje: "El total debe ser mayor o igual a 0." });
    }

    if (estadoTexto.length > 50) {
        return res.status(400).json({ mensaje: "El estado no puede superar 50 caracteres." });
    }

    conexion.query(
        "UPDATE compras SET correo = ?, direccion = ?, total = ?, estado = ?, correo_enviado = ? WHERE id = ?",
        [correoTexto, direccionTexto, totalNumero, estadoTexto, correoEnviadoNumero, id],
        (error) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json({ mensaje: "Compra actualizada correctamente." });
        }
    );
};

exports.eliminarCompraAdmin = (req, res) => {
    const { id } = req.params;

    conexion.query("DELETE FROM compras WHERE id = ?", [id], (error, resultado) => {
        if (error) {
            return res.status(500).json(error);
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: "Compra no encontrada." });
        }

        res.json({ mensaje: "Compra eliminada correctamente." });
    });
};

exports.eliminarPedidoAdmin = (req, res) => {
    const pedidoId = Number(req.params.id);

    if (!Number.isFinite(pedidoId) || pedidoId <= 0) {
        return res.status(400).json({ mensaje: "El ID del pedido no es válido." });
    }

    conexion.beginTransaction((txError) => {
        if (txError) {
            return res.status(500).json(txError);
        }

        conexion.query(
            "SELECT producto_id, cantidad FROM pedidos_productos WHERE pedido_id = ?",
            [pedidoId],
            (itemsError, items) => {
                if (itemsError) {
                    return conexion.rollback(() => res.status(500).json(itemsError));
                }

                const restaurarStock = (index) => {
                    if (index >= items.length) {
                        conexion.query("DELETE FROM pedidos WHERE id = ?", [pedidoId], (deleteError, resultado) => {
                            if (deleteError) {
                                return conexion.rollback(() => res.status(500).json(deleteError));
                            }

                            if (resultado.affectedRows === 0) {
                                return conexion.rollback(() => res.status(404).json({ mensaje: "Pedido no encontrado." }));
                            }

                            conexion.commit((commitError) => {
                                if (commitError) {
                                    return conexion.rollback(() => res.status(500).json(commitError));
                                }

                                return res.json({ mensaje: "Envío eliminado correctamente." });
                            });
                        });
                        return;
                    }

                    const item = items[index];
                    conexion.query(
                        "UPDATE productos SET stock = stock + ? WHERE id = ?",
                        [Number(item.cantidad || 0), Number(item.producto_id)],
                        (stockError) => {
                            if (stockError) {
                                return conexion.rollback(() => res.status(500).json(stockError));
                            }

                            restaurarStock(index + 1);
                        }
                    );
                };

                restaurarStock(0);
            }
        );
    });
};

exports.eliminarDetallePedidoAdmin = (req, res) => {
    const detalleId = Number(req.params.id);
    if (!Number.isFinite(detalleId) || detalleId <= 0) {
        return res.status(400).json({ mensaje: "ID de detalle no válido." });
    }
    conexion.query("DELETE FROM pedidos_productos WHERE id = ?", [detalleId], (error, resultado) => {
        if (error) return res.status(500).json(error);
        if (resultado.affectedRows === 0) return res.status(404).json({ mensaje: "Detalle no encontrado." });
        res.json({ mensaje: "Detalle eliminado correctamente." });
    });
};

exports.obtenerEstadisticas = (req, res) => {
    const consultas = {
        totalProductos: "SELECT COUNT(*) AS total FROM productos",
        totalUsuarios: "SELECT COUNT(*) AS total FROM usuarios",
        totalPedidos: "SELECT COUNT(*) AS total FROM pedidos",
        ventasTotales: "SELECT IFNULL(SUM(total),0) AS total FROM pedidos",
        productosVendidos: "SELECT IFNULL(SUM(cantidad),0) AS total FROM pedidos_productos"
    };

    const resultados = {};
    const keys = Object.keys(consultas);

    const ejecutar = (index) => {
        if (index >= keys.length) {
            return res.json(resultados);
        }
        const key = keys[index];
        conexion.query(consultas[key], (error, rows) => {
            if (error) {
                return res.status(500).json(error);
            }
            resultados[key] = rows[0].total;
            ejecutar(index + 1);
        });
    };

    ejecutar(0);
};

// Nueva función para crear pedidos sin autenticación
exports.crearPedidoSinAuth = (req, res) => {
    const { items, total, direccion, correoConfirmacion, nombreCliente } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: "El carrito no puede estar vacío." });
    }

    const correoDestino = String(correoConfirmacion || "").trim();

    if (!correoDestino) {
        return res.status(400).json({ mensaje: "Debes ingresar un correo para recibir la confirmación." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoDestino)) {
        return res.status(400).json({ mensaje: "El correo ingresado no es válido." });
    }

    const itemsNormalizados = items.map((item) => ({
        id: Number(item.id),
        cantidad: Number(item.cantidad)
    }));

    const itemsValidos = itemsNormalizados.every(
        (item) => Number.isFinite(item.id) && Number.isFinite(item.cantidad) && item.cantidad > 0
    );

    if (!itemsValidos) {
        return res.status(400).json({ mensaje: "Hay productos o cantidades inválidas en el carrito." });
    }

    const cantidadesPorProducto = new Map();
    itemsNormalizados.forEach((item) => {
        const acumulado = cantidadesPorProducto.get(item.id) || 0;
        cantidadesPorProducto.set(item.id, acumulado + item.cantidad);
    });

    const idsProductos = Array.from(cantidadesPorProducto.keys());
    if (idsProductos.length === 0) {
        return res.status(400).json({ mensaje: "Hay productos inválidos en el carrito." });
    }

    const placeholders = idsProductos.map(() => "?").join(",");
    conexion.beginTransaction((txError) => {
        if (txError) {
            return res.status(500).json(txError);
        }

        const rollback = (error, status = 500) =>
            conexion.rollback(() => res.status(status).json(error));

        conexion.query(
            `SELECT id, nombre, precio, stock FROM productos WHERE id IN (${placeholders}) FOR UPDATE`,
            idsProductos,
            (productosError, productosRows) => {
                if (productosError) {
                    return rollback(productosError);
                }

                const productosMap = new Map((productosRows || []).map((row) => [Number(row.id), row]));
                const todosValidos = idsProductos.every((id) => productosMap.has(id));

                if (!todosValidos) {
                    return rollback(
                        { mensaje: "Algunos productos del carrito ya no existen. Actualiza tu carrito e intenta de nuevo." },
                        400
                    );
                }

                const stockInsuficiente = idsProductos.find((id) => {
                    const stockActual = Number(productosMap.get(id)?.stock || 0);
                    return cantidadesPorProducto.get(id) > stockActual;
                });

                if (stockInsuficiente) {
                    const producto = productosMap.get(stockInsuficiente);
                    return rollback(
                        {
                            mensaje: `Stock insuficiente para ${producto?.nombre || `ID ${stockInsuficiente}`}. Actualiza tu carrito.`
                        },
                        400
                    );
                }

                const pedidoTotalCalculado = itemsNormalizados.reduce((acumulado, item) => {
                    const producto = productosMap.get(item.id);
                    return acumulado + Number(producto?.precio || 0) * item.cantidad;
                }, 0);

                const totalCliente = Number(total);
                if (Number.isFinite(totalCliente) && Math.abs(totalCliente - pedidoTotalCalculado) > 0.01) {
                    return rollback(
                        { mensaje: "El total del pedido cambió. Actualiza tu carrito e intenta de nuevo." },
                        400
                    );
                }

                // Para clientes sin autenticación, usamos un ID de usuario especial
                const userIdSinAuth = 0; // 0 representa cliente anónimo

                conexion.query("SHOW COLUMNS FROM pedidos", (schemaError, columnasPedidos) => {
                    if (schemaError) {
                        return rollback(schemaError);
                    }

                    const campos = Array.isArray(columnasPedidos)
                        ? columnasPedidos.map((columna) => String(columna.Field).toLowerCase())
                        : [];

                    const columnasInsert = ["usuario_id", "total", "estado"];
                    const valoresInsert = [userIdSinAuth, pedidoTotalCalculado, "Pendiente"];

                    if (campos.includes("direccion")) {
                        columnasInsert.push("direccion");
                        valoresInsert.push(direccion || "Recoger en tienda");
                    }

                    if (campos.includes("created_at")) {
                        columnasInsert.push("created_at");
                    }

                    const insertPlaceholders = columnasInsert
                        .map((columna) => (columna === "created_at" ? "NOW()" : "?"))
                        .join(", ");
                    const sqlInsertPedido = `INSERT INTO pedidos(${columnasInsert.join(", ")}) VALUES (${insertPlaceholders})`;

                    conexion.query(sqlInsertPedido, valoresInsert, (insertPedidoError, resultado) => {
                        if (insertPedidoError) {
                            return rollback(insertPedidoError);
                        }

                        const pedidoId = resultado.insertId;
                        const columnasCompra = ["pedido_id", "usuario_id", "correo", "direccion", "total", "estado", "correo_enviado"];
                        const sqlInsertCompra = `INSERT INTO compras(${columnasCompra.join(", ")}) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                        const valoresCompra = [
                            pedidoId,
                            userIdSinAuth,
                            correoDestino,
                            direccion || "Recoger en tienda",
                            pedidoTotalCalculado,
                            "Pendiente",
                            0
                        ];

                        conexion.query(sqlInsertCompra, valoresCompra, (insertCompraError, compraResultado) => {
                            if (insertCompraError) {
                                return rollback(insertCompraError);
                            }

                            const compraId = compraResultado.insertId;
                            const valoresDetalle = itemsNormalizados.map((item) => {
                                const producto = productosMap.get(item.id);
                                return [pedidoId, item.id, item.cantidad, Number(producto?.precio || 0)];
                            });

                            conexion.query(
                                "INSERT INTO pedidos_productos(pedido_id, producto_id, cantidad, precio) VALUES ?",
                                [valoresDetalle],
                                (insertDetalleError) => {
                                    if (insertDetalleError) {
                                        return rollback(insertDetalleError);
                                    }

                                    const actualizarStock = (index) => {
                                        if (index >= idsProductos.length) {
                                            const finalizarCompra = async () => {
                                                try {
                                                    const cliente = nombreCliente || "Cliente";
                                                    const detallesCorreo = itemsNormalizados
                                                        .map((item) => {
                                                            const producto = productosMap.get(item.id);
                                                            const precioProducto = Number(producto?.precio || 0);
                                                            return `<li>${producto?.nombre || item.id} x ${item.cantidad} - $${(precioProducto * item.cantidad).toFixed(2)}</li>`;
                                                        })
                                                        .join("");

                                                    const correoEnviado = await enviarCorreo(
                                                        correoDestino,
                                                        "Compra realizada con éxito - Tinta Retirada",
                                                        `<h2>Pedido #${pedidoId} confirmado</h2>
                                                        <p>Hola ${cliente},</p>
                                                        <p>Tu compra fue realizada con éxito. Hemos registrado tu pedido con un total de <strong>$${pedidoTotalCalculado.toFixed(2)}</strong>.</p>
                                                        <p><strong>Dirección de envío/retiro:</strong> ${direccion || "Recoger en tienda"}</p>
                                                        <p><strong>Detalle de productos:</strong></p>
                                                        <ul>${detallesCorreo}</ul>
                                                        <p><strong>Total:</strong> $${pedidoTotalCalculado.toFixed(2)}</p>
                                                        <p>Gracias por comprar en Tinta Retirada.</p>`
                                                    );

                                                    if (!correoEnviado) {
                                                        return rollback(
                                                            { mensaje: "No se pudo enviar el correo de confirmación. Intenta nuevamente en unos minutos." },
                                                            502
                                                        );
                                                    }

                                                    conexion.query(
                                                        "UPDATE compras SET correo_enviado = 1, estado = ? WHERE id = ?",
                                                        ["Confirmada", compraId],
                                                        (updateCompraError) => {
                                                            if (updateCompraError) {
                                                                return rollback(updateCompraError);
                                                            }

                                                            conexion.commit((commitError) => {
                                                                if (commitError) {
                                                                    return rollback(commitError);
                                                                }

                                                                return res.status(201).json({
                                                                    mensaje: "Pedido creado correctamente.",
                                                                    pedidoId,
                                                                    compraId,
                                                                    total: Number(pedidoTotalCalculado.toFixed(2)),
                                                                    correoEnviado: true
                                                                });
                                                            });
                                                        }
                                                    );
                                                } catch (finalizarError) {
                                                    console.error("Error al finalizar compra:", finalizarError);
                                                    return rollback(
                                                        { mensaje: "Error inesperado al finalizar el pedido. Intenta nuevamente." },
                                                        500
                                                    );
                                                }
                                            };

                                            finalizarCompra();
                                            return;
                                        }

                                        const productoId = idsProductos[index];
                                        const cantidadSolicitada = cantidadesPorProducto.get(productoId) || 0;
                                        conexion.query(
                                            "UPDATE productos SET stock = stock - ? WHERE id = ?",
                                            [cantidadSolicitada, productoId],
                                            (stockError) => {
                                                if (stockError) {
                                                    return rollback(stockError);
                                                }
                                                actualizarStock(index + 1);
                                            }
                                        );
                                    };

                                    actualizarStock(0);
                                }
                            );
                        });
                    });
                });
            }
        );
    });
};
