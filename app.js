// app.js
const express = require("express");
const logger = require("./utils/logger");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const dotenv = require('dotenv');
const retrieveSecrets = require('./config/env');
const fs = require('fs/promises');

// Primero creamos la app express
const app = express();

// Configuración de CORS
const allowedOrigins = {
  development: ["http://localhost:3000"],
  production: ["https://www.lawanalytics.app", "https://lawanalytics.app"]
};

const currentEnv = process.env.NODE_ENV || "development";
const currentAllowedOrigins = allowedOrigins[currentEnv] || allowedOrigins.development;

// Configuración de CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir solicitudes sin origen (como herramientas de desarrollo)
      if (!origin) return callback(null, true);

      if (currentAllowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`Origen bloqueado por CORS: ${origin}`);
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "DELETE", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
// Headers específicos para Cross-Origin-Opener-Policy
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));

// Registrar cada solicitud entrante
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Ruta de prueba (esta puede quedar aquí)
app.get("/", (req, res) => {
  res.send("API funcionando");
  logger.info("API funcionando");
});



// Inicialización asíncrona con secretos
retrieveSecrets()
  .then(secretsString => {
    return fs.writeFile(".env", secretsString);
  })
  .then(() => {
    dotenv.config();

    // Ahora importamos las cosas que dependen de variables de entorno
    const connectDB = require("./utils/db");
    const routes = require("./routes");

    // Conectar a la base de datos
    connectDB();

    // Configurar rutas
    app.use(routes);

    // Middleware para rutas no encontradas (404)
    app.use((req, res, next) => {
      logger.warn(`Ruta no encontrada: ${req.method} ${req.url}`);
      res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
      });
    });


    // Middleware de manejo de errores generales
    app.use((err, req, res, next) => {
      logger.error(`Error en la solicitud ${req.method} ${req.url}: ${err.message}`);
      logger.error(err.stack);

      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Error del servidor'
      });
    });

    logger.info("Configuración asíncrona completada correctamente");
  })
  .catch(err => {
    console.error("Error configurando secretos:", err);
    logger.error(`Error configurando la aplicación: ${err.message}`);
  });

module.exports = app;