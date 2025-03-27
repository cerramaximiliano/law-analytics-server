const UserStats = require('../models/UserStats');
const logger = require('../utils/logger');


exports.getUserStats = async (req, res) => {
    try {
        // Obtener el id del usuario desde el middleware de autenticación
        const userId = req.user._id;

        // Buscar las estadísticas del usuario
        let userStats = await UserStats.findOne({ userId });

        // Si no existen estadísticas, crear un documento por defecto
        if (!userStats) {
            userStats = new UserStats({ userId });
            await userStats.save();
        }

        res.json({
            success: true,
            data: userStats
        });
    } catch (err) {
        logger.error('Error al obtener estadísticas de usuario:', err);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener estadísticas'
        });
    }
};
