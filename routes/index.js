// routes/index.js
const express = require("express");

// Importar todas las rutas
const authRoutes = require("./authRoutes");
const emailRoutes = require("./emailRoutes");
const alertRoutes = require("./alertRoutes");
const contactRoutes = require("./contactRoutes");
const cloudinaryRoutes = require("./cloudinaryRoutes");
const eventRoutes = require("./eventRoutes");
const folderRoutes = require("./folderRoutes");

const router = express.Router();

// Configurar las rutas
router.use("/api/auth", authRoutes);
router.use("/api", emailRoutes);
router.use("/alert", alertRoutes);
router.use("/cloudinary", cloudinaryRoutes);
router.use("/api/contacts", contactRoutes);
router.use("/api/folders", folderRoutes);
router.use("/api/events", eventRoutes);

module.exports = router;
