const express = require("express");
const router = express.Router();
const pedidosController = require("../controllers/pedidosController");
const { proteger } = require("../middlewares/auth");

router.post("/crear", proteger, pedidosController.crearPedido);
router.post("/crear-sin-auth", pedidosController.crearPedidoSinAuth);
router.get("/usuario", proteger, pedidosController.obtenerPedidosUsuario);
router.get("/admin", pedidosController.obtenerPedidosAdmin);
router.get("/admin/detalles", pedidosController.obtenerPedidosProductosAdmin);
router.get("/admin/compras", pedidosController.obtenerComprasAdmin);
router.put("/admin/detalles/:id/tipos", pedidosController.actualizarTiposPedidoProducto);
router.put("/admin/compras/:id", pedidosController.actualizarCompraAdmin);
router.put("/admin/:id/tipos", pedidosController.actualizarTiposPedido);
router.put("/admin/:id", pedidosController.actualizarEstado);
router.delete("/admin/compras/:id", pedidosController.eliminarCompraAdmin);
router.delete("/admin/detalles/:id", pedidosController.eliminarDetallePedidoAdmin);
router.delete("/admin/:id", pedidosController.eliminarPedidoAdmin);
router.get("/estadisticas", pedidosController.obtenerEstadisticas);

module.exports = router;
