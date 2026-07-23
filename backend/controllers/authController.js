const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const conexion = require("../config/db");

const enviarCorreo = async (destinatario, asunto, html) => {
    try {
        const transport = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transport.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: destinatario,
            subject: asunto,
            html
        });
    } catch (error) {
        console.error("Error enviando correo:", error);
    }
};

// ==============================
// REGISTRO DE USUARIO
// ==============================
exports.registro = async (req, res) => {

    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
        return res.status(400).json({ mensaje: "Complete todos los campos." });
    }

    try {
        conexion.query(
            "SELECT * FROM usuarios WHERE correo = ?",
            [correo],
            async (error, resultado) => {
                if (error) {
                    return res.status(500).json(error);
                }

                if (resultado.length > 0) {
                    return res.status(400).json({
                        mensaje: "El correo ya está registrado."
                    });
                }

                const passwordHash = await bcrypt.hash(password, 10);

                conexion.query(
                    "INSERT INTO usuarios(nombre, correo, password, rol) VALUES (?, ?, ?, ?)",
                    [nombre, correo, passwordHash, "user"],
                    async (error) => {
                        if (error) {
                            return res.status(500).json(error);
                        }

                        await enviarCorreo(
                            correo,
                            "Bienvenido a Tinta Retirada",
                            `<p>Hola <strong>${nombre}</strong>,</p><p>Gracias por registrarte en Tinta Retirada. Ya puedes iniciar sesión y comenzar a comprar.</p>`
                        );

                        res.status(201).json({
                            mensaje: "Usuario registrado correctamente."
                        });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno del servidor."
        });
    }
};

// ==============================
// LOGIN
// ==============================
exports.login = (req, res) => {

    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ mensaje: "Complete correo y contraseña." });
    }

    conexion.query(
        "SELECT * FROM usuarios WHERE correo = ? OR nombre = ?",
        [correo, correo],
        async (error, resultado) => {
            if (error) {
                return res.status(500).json(error);
            }

            if (resultado.length === 0) {
                return res.status(401).json({
                    mensaje: "Usuario no encontrado."
                });
            }

            const usuario = resultado[0];
            const valido = await bcrypt.compare(password, usuario.password);

            if (!valido) {
                return res.status(401).json({
                    mensaje: "Contraseña incorrecta."
                });
            }

            const token = jwt.sign(
                {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    rol: usuario.rol
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "24h"
                }
            );

            res.json({
                mensaje: "Inicio de sesión exitoso.",
                token,
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol
                }
            });
        }
    );
};

exports.obtenerUsuarios = (req, res) => {
    conexion.query("SHOW COLUMNS FROM usuarios", (columnsError, columns) => {
        if (columnsError) {
            return res.status(500).json(columnsError);
        }

        const campos = Array.isArray(columns)
            ? columns.map((columna) => String(columna.Field).toLowerCase())
            : [];

        const campoFecha = campos.includes("created_at")
            ? "created_at"
            : campos.includes("fecha")
                ? "fecha"
                : null;

        const fechaSelect = campoFecha ? `, ${campoFecha} AS created_at` : "";
        const orderBy = campoFecha ? ` ORDER BY ${campoFecha} DESC, id DESC` : " ORDER BY id DESC";

        const sql = `SELECT id, nombre, correo, rol,
            COALESCE(nivel_int, 0) AS nivel_int,
            COALESCE(credito_float, 0) AS credito_float,
            COALESCE(etiqueta_char, 'USR-BASE') AS etiqueta_char
            ${fechaSelect} FROM usuarios${orderBy}`;

        conexion.query(sql, (error, usuarios) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json(usuarios);
        });
    });
};

exports.actualizarTiposUsuario = (req, res) => {
    const { id } = req.params;
    const { nivel_int, credito_float, etiqueta_char } = req.body;

    const nivel = Number(nivel_int);
    const credito = Number(credito_float);
    const etiqueta = String(etiqueta_char || "USR-BASE").trim() || "USR-BASE";

    if (!Number.isFinite(nivel) || nivel < 0) {
        return res.status(400).json({ mensaje: "nivel_int debe ser mayor o igual a 0." });
    }

    if (!Number.isFinite(credito) || credito < 0) {
        return res.status(400).json({ mensaje: "credito_float debe ser mayor o igual a 0." });
    }

    if (etiqueta.length > 10) {
        return res.status(400).json({ mensaje: "etiqueta_char no puede superar 10 caracteres." });
    }

    conexion.query(
        "UPDATE usuarios SET nivel_int = ?, credito_float = ?, etiqueta_char = ? WHERE id = ?",
        [nivel, credito, etiqueta, id],
        (error) => {
            if (error) {
                return res.status(500).json(error);
            }
            res.json({ mensaje: "Tipos de datos de usuario actualizados." });
        }
    );
};

exports.recuperarContrasena = (req, res) => {
    const { correo } = req.body;

    if (!correo) {
        return res.status(400).json({ mensaje: "El correo es requerido." });
    }

    conexion.query(
        "SELECT * FROM usuarios WHERE correo = ?",
        [correo],
        (error, resultado) => {
            if (error) {
                return res.status(500).json(error);
            }

            if (resultado.length === 0) {
                return res.status(404).json({ mensaje: "Correo no registrado." });
            }

            const usuario = resultado[0];
            const tokenPassword = jwt.sign(
                { id: usuario.id, correo: usuario.correo },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            const enlace = `${process.env.FRONTEND_URL || "http://localhost:5173"}/recuperar/${tokenPassword}`;

            enviarCorreo(
                correo,
                "Recuperación de contraseña Tinta Retirada",
                `<p>Hola <strong>${usuario.nombre}</strong>,</p><p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><a href="${enlace}">${enlace}</a><p>El enlace expira en 1 hora.</p>`
            );

            res.json({ mensaje: "Correo de recuperación enviado." });
        }
    );
};

exports.cambiarContrasena = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ mensaje: "Token y nueva contraseña son requeridos." });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const passwordHash = await bcrypt.hash(password, 10);

        conexion.query(
            "UPDATE usuarios SET password = ? WHERE id = ?",
            [passwordHash, payload.id],
            (error) => {
                if (error) {
                    return res.status(500).json(error);
                }

                res.json({ mensaje: "Contraseña actualizada correctamente." });
            }
        );
    } catch (error) {
        res.status(400).json({ mensaje: "Token inválido o expirado." });
    }
};
