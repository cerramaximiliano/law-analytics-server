// app.js
const express = require("express");
const connectDB = require("./utils/db");
const authRoutes = require("./routes/authRoutes");
const logger = require("./utils/logger");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));
// Conectar a la base de datos
connectDB();

// Registrar cada solicitud entrante
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Configurar rutas
app.use("/api/auth", authRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("API funcionando");
    logger.info("API funcionando");
});

module.exports = app;

