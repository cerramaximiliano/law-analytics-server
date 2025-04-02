const express = require("express");
const router = express.Router();
const processController = require("../controllers/processController");
const authMiddleware = require("../middlewares/authMiddleware");



// Ruta para obtener etapas disponibles
router.get("/", authMiddleware, processController.getAvailableStages);

// Rutas para gestionar etapas de un expediente específico
router.post("/:folderId/start-stage", authMiddleware, processController.startStage);
router.post("/:folderId/end-current-stage", authMiddleware, processController.endCurrentStage);
router.get("/:folderId/events", authMiddleware, processController.getStageEvents);
router.get("/:folderId/stats", authMiddleware, processController.getProcessStats);

module.exports = router;