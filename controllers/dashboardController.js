// controllers/dashboardController.js
const User = require('../models/User');
const UserStats = require('../models/UserStats');
const statsService = require('../services/statsService');
const logger = require('../utils/logger');

/**
 * Obtiene los datos del dashboard para un usuario específico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.params.userId || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere ID de usuario'
            });
        }

        // Obtener usuario
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Obtener estadísticas (se actualizarán automáticamente si están desactualizadas)
        const stats = await statsService.getUserStats(userId);

        // Obtener otros datos relevantes para el dashboard
        // Puedes añadir más datos según sea necesario

        // Enviar respuesta
        res.status(200).json({
            success: true,
            dashboard: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    // Otros datos básicos del usuario
                },
                stats,
                // Otros datos del dashboard
            }
        });
    } catch (error) {
        logger.error(`Error al obtener datos de dashboard: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos del dashboard',
            error: error.message
        });
    }
};

/**
 * Actualiza manualmente las estadísticas de un usuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.refreshUserStats = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere ID de usuario'
            });
        }

        // Verificar permisos (solo admin o el propio usuario)
        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos para actualizar estas estadísticas'
            });
        }

        // Actualizar estadísticas
        const success = await statsService.updateUserStats(userId);

        if (!success) {
            return res.status(400).json({
                success: false,
                message: 'No se pudieron actualizar las estadísticas'
            });
        }

        // Obtener estadísticas actualizadas
        const stats = await UserStats.findOne({ userId });

        res.status(200).json({
            success: true,
            message: 'Estadísticas actualizadas correctamente',
            stats: stats?.counts || {}
        });
    } catch (error) {
        logger.error(`Error al actualizar estadísticas: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar estadísticas',
            error: error.message
        });
    }
};

module.exports = exports;