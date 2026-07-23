const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const conexion = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: "utf8mb4"
});

// Compatibilidad defensiva: permite usar conexion.query con callback o con await.
const queryOriginal = conexion.query.bind(conexion);
conexion.query = (...args) => {
    const ultimoArg = args[args.length - 1];
    if (typeof ultimoArg === "function") {
        return queryOriginal(...args);
    }

    return new Promise((resolve, reject) => {
        queryOriginal(...args, (error, resultados, campos) => {
            if (error) {
                return reject(error);
            }
            resolve([resultados, campos]);
        });
    });
};

const crearTablasIniciales = (callback) => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            correo VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            rol VARCHAR(50) NOT NULL DEFAULT 'user',
            nivel_int INT DEFAULT 0,
            credito_float FLOAT DEFAULT 0,
            etiqueta_char CHAR(10) DEFAULT 'USR-BASE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;`,
        `CREATE TABLE IF NOT EXISTS categorias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            orden_int INT DEFAULT 0,
            factor_float FLOAT DEFAULT 1,
            codigo_char CHAR(10) DEFAULT 'CAT-BASE'
        ) ENGINE=InnoDB;`,
        `CREATE TABLE IF NOT EXISTS productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            descripcion TEXT,
            precio DECIMAL(10,2) DEFAULT 0,
            stock INT DEFAULT 0,
            prioridad INT DEFAULT 0,
            peso FLOAT DEFAULT 0,
            codigo CHAR(12) DEFAULT 'SIN-CODIGO',
            imagen VARCHAR(255),
            categoria_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;`,
        `CREATE TABLE IF NOT EXISTS pedidos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            total DECIMAL(10,2) DEFAULT 0,
            estado VARCHAR(50) DEFAULT 'Pendiente',
            direccion VARCHAR(255),
            prioridad_int INT DEFAULT 0,
            recargo_float FLOAT DEFAULT 0,
            canal_char CHAR(10) DEFAULT 'WEB',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;`,
        `CREATE TABLE IF NOT EXISTS compras (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL UNIQUE,
            usuario_id INT NOT NULL,
            correo VARCHAR(150) NOT NULL,
            direccion VARCHAR(255) NOT NULL,
            total DECIMAL(10,2) DEFAULT 0,
            estado VARCHAR(50) DEFAULT 'Pendiente',
            correo_enviado TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;`,
        `CREATE TABLE IF NOT EXISTS pedidos_productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            producto_id INT NOT NULL,
            cantidad INT NOT NULL,
            precio DECIMAL(10,2) NOT NULL,
            lote_int INT DEFAULT 0,
            impuesto_float FLOAT DEFAULT 0,
            marca_char CHAR(10) DEFAULT 'PP-BASE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;`
    ];

    const ejecutar = (index) => {
        if (index >= queries.length) {
            return callback();
        }
        conexion.query(queries[index], (error) => {
            if (error) {
                console.log("Error creando tablas iniciales:", error);
                return;
            }
            ejecutar(index + 1);
        });
    };

    ejecutar(0);
};

const asegurarColumnasTabla = (tabla, columnasObjetivo, callback) => {
    conexion.query(`SHOW COLUMNS FROM ${tabla}`, (error, columnas) => {
        if (error) {
            console.log(`Error verificando columnas de ${tabla}:`, error);
            return callback();
        }

        const campos = new Set((columnas || []).map((columna) => String(columna.Field).toLowerCase()));
        const alterStatements = [];

        columnasObjetivo.forEach((columna) => {
            if (!campos.has(columna.nombre.toLowerCase())) {
                alterStatements.push(`ADD COLUMN ${columna.definicion}`);
            }
        });

        if (alterStatements.length === 0) {
            return callback();
        }

        conexion.query(`ALTER TABLE ${tabla} ${alterStatements.join(", ")}`, (alterError) => {
            if (alterError) {
                console.log(`Error aplicando migración de tipos de datos en ${tabla}:`, alterError);
            } else {
                console.log(`Migración aplicada en ${tabla}: columnas INT/FLOAT/CHAR aseguradas.`);
            }
            callback();
        });
    });
};

const asegurarTiposDatosTablas = (callback) => {
    const migraciones = [
        {
            tabla: "usuarios",
            columnas: [
                { nombre: "nivel_int", definicion: "nivel_int INT DEFAULT 0" },
                { nombre: "credito_float", definicion: "credito_float FLOAT DEFAULT 0" },
                { nombre: "etiqueta_char", definicion: "etiqueta_char CHAR(10) DEFAULT 'USR-BASE'" }
            ]
        },
        {
            tabla: "categorias",
            columnas: [
                { nombre: "orden_int", definicion: "orden_int INT DEFAULT 0" },
                { nombre: "factor_float", definicion: "factor_float FLOAT DEFAULT 1" },
                { nombre: "codigo_char", definicion: "codigo_char CHAR(10) DEFAULT 'CAT-BASE'" }
            ]
        },
        {
            tabla: "productos",
            columnas: [
                { nombre: "prioridad", definicion: "prioridad INT DEFAULT 0" },
                { nombre: "peso", definicion: "peso FLOAT DEFAULT 0" },
                { nombre: "codigo", definicion: "codigo CHAR(12) DEFAULT 'SIN-CODIGO'" }
            ]
        },
        {
            tabla: "pedidos",
            columnas: [
                { nombre: "prioridad_int", definicion: "prioridad_int INT DEFAULT 0" },
                { nombre: "recargo_float", definicion: "recargo_float FLOAT DEFAULT 0" },
                { nombre: "canal_char", definicion: "canal_char CHAR(10) DEFAULT 'WEB'" }
            ]
        },
        {
            tabla: "compras",
            columnas: [
                { nombre: "pedido_id", definicion: "pedido_id INT NOT NULL UNIQUE" },
                { nombre: "usuario_id", definicion: "usuario_id INT NOT NULL" },
                { nombre: "correo", definicion: "correo VARCHAR(150) NOT NULL" },
                { nombre: "direccion", definicion: "direccion VARCHAR(255) NOT NULL" },
                { nombre: "total", definicion: "total DECIMAL(10,2) DEFAULT 0" },
                { nombre: "estado", definicion: "estado VARCHAR(50) DEFAULT 'Pendiente'" },
                { nombre: "correo_enviado", definicion: "correo_enviado TINYINT(1) DEFAULT 0" },
                { nombre: "created_at", definicion: "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
                { nombre: "updated_at", definicion: "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
            ]
        },
        {
            tabla: "pedidos_productos",
            columnas: [
                { nombre: "lote_int", definicion: "lote_int INT DEFAULT 0" },
                { nombre: "impuesto_float", definicion: "impuesto_float FLOAT DEFAULT 0" },
                { nombre: "marca_char", definicion: "marca_char CHAR(10) DEFAULT 'PP-BASE'" },
                { nombre: "created_at", definicion: "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
                { nombre: "updated_at", definicion: "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
            ]
        }
    ];

    const ejecutar = (index) => {
        if (index >= migraciones.length) {
            return callback();
        }

        const actual = migraciones[index];
        asegurarColumnasTabla(actual.tabla, actual.columnas, () => ejecutar(index + 1));
    };

    ejecutar(0);
};

const crearDatosIniciales = async () => {
    const correoAdmin = process.env.ADMIN_EMAIL || "admin";
    const passwordAdmin = process.env.ADMIN_PASSWORD || "1234567890";
    const nombreAdmin = process.env.ADMIN_NAME || "Administrador";
    const rolAdmin = "admin";
    const categoriasBase = [["Camisetas"], ["Jeans"], ["Chaquetas"], ["Accesorios"]];
    const productosBase = [
        ["Camiseta Urbana", "Camiseta de algodón premium con estampado de edición limitada.", 24.99, 35, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80", 1],
        ["Jeans Slim Fit", "Jeans stretch con corte slim y detalles desgastados.", 49.99, 28, "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80", 2],
        ["Chaqueta Vintage", "Chaqueta de mezclilla con interior forrado y diseño clásico.", 79.99, 18, "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80", 3],
        ["Gorra Street", "Gorra ajustable con logo bordado y visera curva.", 19.99, 50, "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80", 4],
        ["Sudadera Oversize", "Sudadera con capucha, suave y cómoda para uso diario.", 39.99, 40, "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=80", 1],
        ["Cazadora Bomber", "Cazadora bomber acolchada en tonos oscuros.", 89.99, 22, "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80", 3],
        ["Pantalón Cargo", "Pantalón cargo con múltiples bolsillos y cierre ajustable.", 54.99, 30, "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80", 2],
        ["Mochila Urbana", "Mochila resistente con compartimento para laptop.", 44.99, 55, "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", 4],
        ["Camiseta Manga Larga", "Camiseta de algodón orgánico con corte entallado.", 29.99, 46, "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80", 1],
        ["Jeans Relaxed", "Jeans con corte relajado y detalle de costura visible.", 59.99, 24, "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80", 2],
        ["Parka Técnica", "Parka impermeable con capucha desmontable.", 119.99, 16, "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80", 3],
        ["Gafas de Sol", "Gafas de sol estilo retro con protección UV.", 24.99, 60, "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80", 4],
        ["Camisa Estampada", "Camisa ligera con estampado geométrico.", 34.99, 27, "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80", 1],
        ["Chino Casual", "Pantalón chino cómodo para looks formales e informales.", 42.99, 32, "https://images.unsplash.com/photo-1584865288642-42078afe6942?auto=format&fit=crop&w=900&q=80", 2],
        ["Abrigo Lana", "Abrigo de lana con cuello alto y forro interior.", 129.99, 14, "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?auto=format&fit=crop&w=900&q=80", 3],
        ["Cinturón Cuero", "Cinturón de cuero genuino con hebilla metálica.", 29.99, 65, "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=80", 4],
        ["Top Corto", "Top corto con detalle de encaje y corte moderno.", 27.99, 33, "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=900&q=80", 1],
        ["Short Denim", "Short de mezclilla con corte desenfadado.", 34.99, 42, "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=80", 2],
        ["Chaqueta Softshell", "Chaqueta softshell ligera para clima variable.", 94.99, 20, "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80", 3],
        ["Bufanda Premium", "Bufanda suave de lana para invierno elegante.", 22.99, 45, "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=900&q=80", 4],
        ["Conjunto Deportivo", "Conjunto de sudadera y pantalón para entrenar con estilo.", 64.99, 26, "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80", 1],
        ["Joggers", "Joggers cómodos de algodón con bolsillos laterales.", 39.99, 34, "https://images.unsplash.com/photo-1506629905607-d9d77fc5f895?auto=format&fit=crop&w=900&q=80", 2],
        ["Chaqueta Acolchada", "Chaqueta acolchada ligera con cuello alto.", 69.99, 22, "https://images.unsplash.com/photo-1593032465175-481ac7f4018c?auto=format&fit=crop&w=900&q=80", 3],
        ["Pulsera Minimal", "Pulsera de metal con diseño discreto para uso diario.", 14.99, 72, "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80", 4],
        ["Camiseta Básica Blanca", "Playera esencial de corte regular para combinar con todo.", 21.99, 80, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80", 1],
        ["Jeans Wide Leg", "Jeans de tiro alto con pierna amplia y acabado moderno.", 61.99, 25, "https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=900&q=80", 2],
        ["Gabardina Urbana", "Gabardina ligera para entretiempo con estilo minimalista.", 109.99, 15, "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=900&q=80", 3],
        ["Riñonera Daily", "Riñonera compacta ideal para ciudad y viajes cortos.", 26.99, 58, "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80", 4],
        ["Hoodie Essential", "Hoodie unisex afelpada con ajuste cómodo.", 46.99, 37, "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=900&q=80", 1],
        ["Pantalón Recto", "Pantalón recto clásico para look casual elegante.", 44.99, 29, "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80", 2]
    ];

    conexion.query(
        "SELECT * FROM usuarios WHERE correo = ?",
        [correoAdmin],
        async (error, resultado) => {
            if (error) {
                console.log("Error al verificar usuario administrador:", error);
                return;
            }

            if (resultado.length === 0) {
                const passwordHash = await bcrypt.hash(passwordAdmin, 10);
                conexion.query(
                    "INSERT INTO usuarios(nombre, correo, password, rol) VALUES (?, ?, ?, ?)",
                    [nombreAdmin, correoAdmin, passwordHash, rolAdmin],
                    (insertError) => {
                        if (insertError) {
                            console.log("Error al crear usuario administrador:", insertError);
                        } else {
                            console.log(`Usuario administrador creado: ${correoAdmin}`);
                        }
                    }
                );
            } else {
                console.log(`Usuario administrador existente: ${correoAdmin}`);
            }
        }
    );

    const asegurarProductosBase = () => {
        conexion.query("SELECT nombre FROM productos", (error, productosExistentes) => {
            if (error) {
                console.log("Error verificando productos:", error);
                return;
            }

            const nombresExistentes = new Set(
                productosExistentes.map((producto) => String(producto.nombre).toLowerCase())
            );

            const faltantes = productosBase.filter(
                (producto) => !nombresExistentes.has(String(producto[0]).toLowerCase())
            );

            if (faltantes.length === 0) {
                console.log("Catálogo base ya contiene al menos 30 productos.");
                return;
            }

            conexion.query(
                `INSERT INTO productos (nombre, descripcion, precio, stock, imagen, categoria_id)
                 VALUES ?`,
                [faltantes],
                (insertError) => {
                    if (insertError) {
                        console.log("Error insertando productos base:", insertError);
                    } else {
                        console.log(`Productos base insertados: ${faltantes.length}`);
                    }
                }
            );
        });
    };

    conexion.query("SELECT COUNT(*) AS total FROM categorias", (error, resultado) => {
        if (error) {
            console.log("Error verificando categorías:", error);
            return;
        }

        if (resultado[0].total === 0) {
            conexion.query("INSERT INTO categorias(nombre) VALUES ?", [categoriasBase], (insertError) => {
                if (insertError) {
                    console.log("Error insertando categorías iniciales:", insertError);
                    return;
                }
                asegurarProductosBase();
            });
            return;
        }

        asegurarProductosBase();
    });
};

conexion.connect((error) => {
    if (error) {
        console.log("Error al conectar con MySQL:");
        console.log(error);
    } else {
        console.log("Conexión a MySQL exitosa");
        crearTablasIniciales(() => {
            asegurarTiposDatosTablas(crearDatosIniciales);
        });
    }
});

module.exports = conexion;