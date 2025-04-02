const express = require('express');
const router = express.Router();
const notificationPreferencesController = require('../controllers/notificationPreferencesController');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Obtener preferencias de notificaciones
router.get('/preferences', notificationPreferencesController.getNotificationPreferences);

// Actualizar preferencias de notificaciones
router.put('/preferences', notificationPreferencesController.updateNotificationPreferences);

module.exports = router;