const express = require("express");
const router = express.Router();
const pedidosController = require("../controllers/pedidosController");
const { proteger, admin } = require("../middlewares/auth");

router.post("/crear", proteger, pedidosController.crearPedido);
router.get("/usuario", proteger, pedidosController.obtenerPedidosUsuario);
router.get("/admin", proteger, admin, pedidosController.obtenerPedidosAdmin);
router.get("/admin/detalles", proteger, admin, pedidosController.obtenerPedidosProductosAdmin);
router.get("/admin/compras", proteger, admin, pedidosController.obtenerComprasAdmin);
router.put("/admin/:id", proteger, admin, pedidosController.actualizarEstado);
router.put("/admin/:id/tipos", proteger, admin, pedidosController.actualizarTiposPedido);
router.put("/admin/detalles/:id/tipos", proteger, admin, pedidosController.actualizarTiposPedidoProducto);
router.put("/admin/compras/:id", proteger, admin, pedidosController.actualizarCompraAdmin);
router.delete("/admin/compras/:id", proteger, admin, pedidosController.eliminarCompraAdmin);
router.delete("/admin/:id", proteger, admin, pedidosController.eliminarPedidoAdmin);
router.get("/estadisticas", proteger, admin, pedidosController.obtenerEstadisticas);

module.exports = router;
