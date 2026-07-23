const express = require("express");
const router = express.Router();

const auth = require("../controllers/authController");
const { proteger, admin } = require("../middlewares/auth");

router.post("/registro", auth.registro);
router.post("/login", auth.login);
router.post("/recuperar", auth.recuperarContrasena);
router.post("/cambiar", auth.cambiarContrasena);
router.get("/usuarios", proteger, admin, auth.obtenerUsuarios);
router.put("/usuarios/:id/tipos", proteger, admin, auth.actualizarTiposUsuario);

module.exports = router;