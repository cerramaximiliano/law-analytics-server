// server/routes/statsAnalysisRoutes.js
const express = require('express');
const router = express.Router();
const statsAnalysisController = require('../controllers/statsAnalysisController');
const authMiddleware = require('../middlewares/authMiddleware');
// Middleware para verificar autenticación


// Ruta para obtener el resumen del dashboard
router.get('/dashboard', authMiddleware, statsAnalysisController.getDashboardSummary);
router.get('/dashboard/:userId', authMiddleware, statsAnalysisController.getDashboardSummary);

// Ruta para obtener analíticas completas
router.get('/analytics', authMiddleware, statsAnalysisController.getUserAnalytics);
router.get('/analytics/:userId', authMiddleware, statsAnalysisController.getUserAnalytics);

// Ruta para obtener análisis por categoría
router.get('/category/:category', authMiddleware, statsAnalysisController.getCategoryAnalysis);
router.get('/:userId/category/:category', authMiddleware, statsAnalysisController.getCategoryAnalysis);

// Ruta para generar o regenerar analíticas
router.post('/generate', authMiddleware, statsAnalysisController.generateUserAnalytics);
router.post('/generate/:userId', authMiddleware, statsAnalysisController.generateUserAnalytics);

// Ruta para generar analíticas de todos los usuarios (solo admin)
router.post('/generate-all', authMiddleware, statsAnalysisController.generateAllAnalytics);

module.exports = router;