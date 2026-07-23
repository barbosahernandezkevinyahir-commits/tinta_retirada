const express = require("express");
const router = express.Router();

const auth = require("../controllers/authController");
const { proteger } = require("../middlewares/auth");

router.post("/registro", auth.registro);
router.post("/login", auth.login);
router.post("/recuperar", auth.recuperarContrasena);
router.post("/cambiar", auth.cambiarContrasena);
router.get("/usuarios", auth.obtenerUsuarios);
router.post("/usuarios", auth.crearUsuario);
router.put("/usuarios/:id", auth.actualizarUsuario);
router.put("/usuarios/:id/tipos", auth.actualizarTiposUsuario);
router.delete("/usuarios/:id", auth.eliminarUsuario);

module.exports = router;