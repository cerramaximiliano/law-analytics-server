
// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

const { trackSession, cleanupOldSessions } = require('../middlewares/sessionMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Aplicar middleware de seguimiento de sesión
router.use(trackSession);

// Obtener todas las sesiones activas del usuario
router.get('/', cleanupOldSessions, sessionController.getActiveSessions);

// Terminar una sesión específica
router.delete('/:deviceId', sessionController.terminateSession);

// Terminar todas las sesiones excepto la actual
router.delete('/', sessionController.terminateAllOtherSessions);

// Actualizar información de la sesión actual
router.patch('/current', sessionController.updateSessionInfo);

module.exports = router;