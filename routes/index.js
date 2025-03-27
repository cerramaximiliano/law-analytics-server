// routes/index.js
const express = require("express");

// Importar todas las rutas
const authRoutes = require("./authRoutes");
const alertRoutes = require("./alertRoutes");
const contactRoutes = require("./contactRoutes");
const cloudinaryRoutes = require("./cloudinaryRoutes");
const eventRoutes = require("./eventRoutes");
const folderRoutes = require("./folderRoutes");
const movementRoutes = require("./movementRoutes");
const notificationRoutes = require("./notificationRoutes");
const calculatorRoutes = require("./calculatorRoutes");
const taskRoutes = require("./taskRoutes");
const emailRoutes = require("./emailRoutes");
const tasasRoutes = require("./tasasRoutes")
const analysisRoutes = require('./statsAnalysisRoutes');
const supportRoutes = require('./supportRoutes');
const userStatsRoutes = require("./userStatsRoutes");

const router = express.Router();

// Configurar una ruta base para verificar que la API está funcionando
router.get('/api/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API lawanalytics server funcionando correctamente',
    apiVersion: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Configurar las rutas
router.use("/api/auth", authRoutes);
router.use("/api", emailRoutes);
router.use("/alert", alertRoutes);
router.use("/cloudinary", cloudinaryRoutes);
router.use("/api/contacts", contactRoutes);
router.use("/api/folders", folderRoutes);
router.use("/api/events", eventRoutes);
router.use("/api/movements", movementRoutes);
router.use("/api/notifications", notificationRoutes);
router.use("/api/calculators", calculatorRoutes);
router.use("/api/tasks", taskRoutes);
router.use("/api/email", emailRoutes);
router.use("/api/tasas", tasasRoutes);
router.use('/api/stats', analysisRoutes);
router.use('/api/support-contacts', supportRoutes);
router.use('/api/user-stats', userStatsRoutes)


module.exports = router;
