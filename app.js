// app.js
const express = require("express");
const connectDB = require("./utils/db");
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");
const alertRoutes = require("./routes/alertRoutes");
const contactRoutes = require("./routes/contactRoutes");
const cloudinaryRoutes = require("./routes/cloudinaryRoutes");
const folder = require("./routes/folderRoutes");
const logger = require("./utils/logger");
const cors = require("cors");
const fileUpload = require("express-fileupload");
require("dotenv").config();

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
  // Cambiamos esta configuración específicamente para permitir popups
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));

// Conectar a la base de datos
connectDB();

// Registrar cada solicitud entrante
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Configurar rutas
app.use("/api/auth", authRoutes);
app.use("/api", emailRoutes);
app.use("/alert", alertRoutes);
app.use("/cloudinary", cloudinaryRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/folders", folder);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API funcionando");
  logger.info("API funcionando");
});

module.exports = app;
