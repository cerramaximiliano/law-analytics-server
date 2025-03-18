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
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "DELETE", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
    
    logger.info("Configuración asíncrona completada correctamente");
  })
  .catch(err => {
    console.error("Error configurando secretos:", err);
    logger.error(`Error configurando la aplicación: ${err.message}`);
  });

module.exports = app;