const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.proteger = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ mensaje: "Token requerido." });
    }

    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: "Token inválido o expirado." });
    }
};

exports.admin = (req, res, next) => {
    if (!req.user || req.user.rol !== "admin") {
        return res.status(403).json({ mensaje: "Acceso denegado. Solo administradores." });
    }
    next();
};
