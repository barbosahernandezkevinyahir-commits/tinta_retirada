const express = require("express");
const router = express.Router();
const conexion = require("../config/db");
const upload = require("../middlewares/upload");

const validarProducto = ({ nombre, precio, stock, prioridad, peso, codigo }) => {
    if (!nombre || String(nombre).trim().length < 2) {
        return "El nombre del producto es obligatorio.";
    }

    const precioNumero = Number(precio);
    if (Number.isNaN(precioNumero) || precioNumero <= 0) {
        return "El precio debe ser mayor a 0.";
    }

    const stockNumero = Number(stock);
    if (Number.isNaN(stockNumero) || stockNumero < 0) {
        return "El stock no puede ser negativo.";
    }

    if (prioridad !== undefined) {
        const prioridadNumero = Number(prioridad);
        if (Number.isNaN(prioridadNumero) || prioridadNumero < 0) {
            return "La prioridad debe ser un entero mayor o igual a 0.";
        }
    }

    if (peso !== undefined) {
        const pesoNumero = Number(peso);
        if (Number.isNaN(pesoNumero) || pesoNumero < 0) {
            return "El peso debe ser mayor o igual a 0.";
        }
    }

    if (codigo !== undefined) {
        const codigoTexto = String(codigo || "").trim();
        if (codigoTexto.length > 12) {
            return "El código no puede superar 12 caracteres.";
        }
    }

    return null;
};

// ==========================================
// OBTENER CATEGORIAS
// ==========================================
router.get("/categorias", (req, res) => {
    conexion.query("SELECT id, nombre, COALESCE(orden_int,0) AS orden_int, COALESCE(factor_float,1) AS factor_float, COALESCE(codigo_char,'CAT-BASE') AS codigo_char FROM categorias ORDER BY id ASC", (error, resultado) => {
        if (error) {
            return res.status(500).json(error);
        }
        res.json(Array.isArray(resultado) ? resultado : []);
    });
});

router.post("/categorias", (req, res) => {
    const { nombre, orden_int, factor_float, codigo_char } = req.body;
    if (!nombre || String(nombre).trim().length < 1) {
        return res.status(400).json({ mensaje: "El nombre de la categoría es obligatorio." });
    }
    const orden = Number(orden_int || 0);
    const factor = Number(factor_float || 1);
    const codigo = String(codigo_char || "CAT-BASE").trim().toUpperCase() || "CAT-BASE";
    conexion.query(
        "INSERT INTO categorias (nombre, orden_int, factor_float, codigo_char) VALUES (?, ?, ?, ?)",
        [String(nombre).trim(), orden, factor, codigo],
        (error, resultado) => {
            if (error) return res.status(500).json(error);
            res.status(201).json({ mensaje: "Categoría creada correctamente.", id: resultado.insertId });
        }
    );
});

router.put("/categorias/:id", (req, res) => {
    const { id } = req.params;
    const { nombre, orden_int, factor_float, codigo_char } = req.body;
    if (!nombre || String(nombre).trim().length < 1) {
        return res.status(400).json({ mensaje: "El nombre de la categoría es obligatorio." });
    }
    const orden = Number(orden_int || 0);
    const factor = Number(factor_float || 1);
    const codigo = String(codigo_char || "CAT-BASE").trim().toUpperCase() || "CAT-BASE";
    conexion.query(
        "UPDATE categorias SET nombre = ?, orden_int = ?, factor_float = ?, codigo_char = ? WHERE id = ?",
        [String(nombre).trim(), orden, factor, codigo, id],
        (error) => {
            if (error) return res.status(500).json(error);
            res.json({ mensaje: "Categoría actualizada correctamente." });
        }
    );
});

router.put("/categorias/:id/tipos", (req, res) => {
    const { id } = req.params;
    const { orden_int, factor_float, codigo_char } = req.body;

    const orden = Number(orden_int);
    const factor = Number(factor_float);
    const codigo = String(codigo_char || "CAT-BASE").trim() || "CAT-BASE";

    if (!Number.isFinite(orden) || orden < 0) {
        return res.status(400).json({ mensaje: "orden_int debe ser mayor o igual a 0." });
    }

    if (!Number.isFinite(factor) || factor < 0) {
        return res.status(400).json({ mensaje: "factor_float debe ser mayor o igual a 0." });
    }

    if (codigo.length > 10) {
        return res.status(400).json({ mensaje: "codigo_char no puede superar 10 caracteres." });
    }

    conexion.query(
        "UPDATE categorias SET orden_int = ?, factor_float = ?, codigo_char = ? WHERE id = ?",
        [orden, factor, codigo, id],
        (error) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json({ mensaje: "Tipos de datos de categoría actualizados." });
        }
    );
});

router.delete("/categorias/:id", (req, res) => {
    const { id } = req.params;
    conexion.query("DELETE FROM categorias WHERE id = ?", [id], (error) => {
        if (error) return res.status(500).json(error);
        res.json({ mensaje: "Categoría eliminada correctamente." });
    });
});

// ==========================================
// OBTENER TODOS LOS PRODUCTOS
// ==========================================
router.get("/", (req, res) => {

    const sql = `
        SELECT
            productos.*,
            COALESCE(categorias.nombre, 'Sin categoría') AS categoria
        FROM productos
        LEFT JOIN categorias
        ON productos.categoria_id = categorias.id
    `;

    conexion.query(sql, (error, resultado) => {

        if (error) {
            return res.status(500).json(error);
        }

        res.json(resultado);

    });

});

// ==========================================
// OBTENER UN PRODUCTO POR ID
// ==========================================
router.get("/:id", (req, res) => {

    const { id } = req.params;

    const sql = `
        SELECT
            productos.*,
            COALESCE(categorias.nombre, 'Sin categoría') AS categoria
        FROM productos
        LEFT JOIN categorias
        ON productos.categoria_id = categorias.id
        WHERE productos.id = ?
    `;

    conexion.query(sql, [id], (error, resultado) => {

        if (error) {
            return res.status(500).json(error);
        }

        res.json(resultado);

    });

});

// ==========================================
// AGREGAR PRODUCTO
// ==========================================
router.post("/", (req, res) => {

    const {
        nombre,
        descripcion,
        precio,
        stock,
        imagen,
        categoria_id,
        prioridad,
        peso,
        codigo
    } = req.body;

    const errorValidacion = validarProducto({ nombre, precio, stock, prioridad, peso, codigo });
    if (errorValidacion) {
        return res.status(400).json({ mensaje: errorValidacion });
    }

    const precioNumero = Number(precio);
    const stockNumero = Number(stock);
    const categoriaNumero = Number(categoria_id);
    const prioridadNumero = Number(prioridad || 0);
    const pesoNumero = Number(peso || 0);
    const codigoTexto = String(codigo || "SIN-CODIGO").trim() || "SIN-CODIGO";

    const insertarProducto = (categoriaFinal) => {
        conexion.query(

            `INSERT INTO productos
            (nombre, descripcion, precio, stock, prioridad, peso, codigo, imagen, categoria_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,

            [
                nombre,
                descripcion || "",
                precioNumero,
                stockNumero,
                prioridadNumero,
                pesoNumero,
                codigoTexto,
                imagen || "",
                categoriaFinal
            ],

            (error, resultado) => {

                if (error) {
                    return res.status(500).json(error);
                }

                conexion.query(
                    `SELECT
                        productos.*,
                        COALESCE(categorias.nombre, 'Sin categoría') AS categoria
                    FROM productos
                    LEFT JOIN categorias ON productos.categoria_id = categorias.id
                    WHERE productos.id = ?`,
                    [resultado.insertId],
                    (selectError, rows) => {
                        if (selectError) {
                            return res.status(201).json({
                                mensaje: "Producto agregado correctamente",
                                id: resultado.insertId
                            });
                        }

                        res.status(201).json({
                            mensaje: "Producto agregado correctamente",
                            id: resultado.insertId,
                            producto: rows?.[0] || null
                        });
                    }
                );

            }

        );
    };

    if (Number.isNaN(categoriaNumero)) {
        insertarProducto(null);
        return;
    }

    conexion.query("SELECT id FROM categorias WHERE id = ? LIMIT 1", [categoriaNumero], (error, categorias) => {
        if (error) {
            return res.status(500).json(error);
        }

        const categoriaFinal = categorias.length > 0 ? categoriaNumero : null;
        insertarProducto(categoriaFinal);
    });

});

// ==========================================
// ACTUALIZAR PRODUCTO
// ==========================================
router.put("/:id", (req, res) => {

    const { id } = req.params;

    const {
        nombre,
        descripcion,
        precio,
        stock,
        imagen,
        categoria_id,
        prioridad,
        peso,
        codigo
    } = req.body;

    const errorValidacion = validarProducto({ nombre, precio, stock, prioridad, peso, codigo });
    if (errorValidacion) {
        return res.status(400).json({ mensaje: errorValidacion });
    }

    const precioNumero = Number(precio);
    const stockNumero = Number(stock);
    const prioridadNumero = Number(prioridad || 0);
    const pesoNumero = Number(peso || 0);
    const codigoTexto = String(codigo || "SIN-CODIGO").trim() || "SIN-CODIGO";
    const categoriaNumero = Number(categoria_id);

    const actualizar = (categoriaFinal) => {
        conexion.query(

            `UPDATE productos
            SET
                nombre = ?,
                descripcion = ?,
                precio = ?,
                stock = ?,
                prioridad = ?,
                peso = ?,
                codigo = ?,
                imagen = ?,
                categoria_id = ?
            WHERE id = ?`,

            [
                nombre,
                descripcion || "",
                precioNumero,
                stockNumero,
                prioridadNumero,
                pesoNumero,
                codigoTexto,
                imagen || "",
                categoriaFinal,
                id
            ],

            (error) => {

                if (error) {
                    return res.status(500).json(error);
                }

                res.json({
                    mensaje: "Producto actualizado correctamente"
                });

            }

        );
    };

    if (Number.isNaN(categoriaNumero)) {
        actualizar(null);
        return;
    }

    conexion.query("SELECT id FROM categorias WHERE id = ? LIMIT 1", [categoriaNumero], (error, categorias) => {
        if (error) {
            return res.status(500).json(error);
        }

        const categoriaFinal = categorias.length > 0 ? categoriaNumero : null;
        actualizar(categoriaFinal);
    });

});

router.put("/:id/tipos", (req, res) => {
    const { id } = req.params;
    const { prioridad, peso, codigo } = req.body;

    const prioridadNumero = Number(prioridad);
    const pesoNumero = Number(peso);
    const codigoTexto = String(codigo || "SIN-CODIGO").trim() || "SIN-CODIGO";

    if (!Number.isFinite(prioridadNumero) || prioridadNumero < 0) {
        return res.status(400).json({ mensaje: "prioridad debe ser mayor o igual a 0." });
    }

    if (!Number.isFinite(pesoNumero) || pesoNumero < 0) {
        return res.status(400).json({ mensaje: "peso debe ser mayor o igual a 0." });
    }

    if (codigoTexto.length > 12) {
        return res.status(400).json({ mensaje: "codigo no puede superar 12 caracteres." });
    }

    conexion.query(
        "UPDATE productos SET prioridad = ?, peso = ?, codigo = ? WHERE id = ?",
        [prioridadNumero, pesoNumero, codigoTexto, id],
        (error) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json({ mensaje: "Tipos de datos de producto actualizados." });
        }
    );
});

// ==========================================
// ELIMINAR PRODUCTO
// ==========================================
router.delete("/:id", (req, res) => {

    const { id } = req.params;

    conexion.query(

        "DELETE FROM productos WHERE id = ?",

        [id],

        (error) => {

            if (error) {
                return res.status(500).json(error);
            }

            res.json({
                mensaje: "Producto eliminado correctamente"
            });

        }

    );

});
router.post(
    "/imagen",
    upload.single("imagen"),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ mensaje: "No se recibió ninguna imagen." });
        }

        res.json({

            nombreArchivo: req.file.filename

        });

    }
);

module.exports = router;