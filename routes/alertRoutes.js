const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");

// Ruta para obtener todas las alertas
router.get("/", alertController.getAllAlerts);
// Ruta para crear una nueva alerta
router.post("/", alertController.createAlert);
router.post("/markAsRead", alertController.markAlertAsRead);
router.get("/useralerts/:userId", alertController.getUserAlerts);
router.delete("/delete-alert", alertController.deleteAlerts);

module.exports = router;
