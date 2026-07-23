const express = require("express");
const cors = require("cors");
const productosRoutes = require("./routes/productos");
const path = require("path");
const authRoutes = require("./routes/auth");
const pedidosRoutes = require("./routes/pedidos");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/productos", productosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/pedidos", pedidosRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor de Tinta Retirada funcionando correctamente");
});

// Conexión a la base de datos
require("./config/db");

const PORT = process.env.PORT || 5000;
app.use(
    "/imagenes",
    express.static(path.join(__dirname,"imagenes"))
);
app.use(
    "/uploads",
    express.static(path.join(__dirname,"uploads"))
);

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});