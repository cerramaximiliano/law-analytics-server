// controllers/sessionController.js
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../utils/logger');

/**
 * Obtener todas las sesiones activas del usuario actual
 */
exports.getActiveSessions = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select('activeSessions');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Preparar la respuesta eliminando información sensible como tokens
        const sessions = user.activeSessions.map(session => ({
            deviceId: session.deviceId,
            deviceName: session.deviceName,
            deviceType: session.deviceType,
            browser: session.browser,
            os: session.os,
            lastActivity: session.lastActivity,
            location: session.location,
            isCurrentSession: session.isCurrentSession
        }));

        return res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        logger.error(`Error al obtener sesiones activas: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las sesiones activas'
        });
    }
};

/**
 * Cerrar una sesión específica por su deviceId
 */
exports.terminateSession = async (req, res) => {
    try {
        const userId = req.user._id;
        const { deviceId } = req.params;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del dispositivo'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar si es la sesión actual
        const isCurrentSession = user.activeSessions.some(
            session => session.deviceId === deviceId && session.isCurrentSession
        );

        // Eliminar la sesión
        user.removeSession(deviceId);
        await user.save();

        // Si es la sesión actual, también invalidar los tokens
        if (isCurrentSession) {
            // Buscar y revocar el token de refresco asociado con esta sesión
            await RefreshToken.updateMany(
                { user: userId },
                { isActive: false, revokedAt: new Date() }
            );

            // Limpiar cookies
            res.clearCookie('auth_token');
            res.clearCookie('refresh_token');

            return res.status(200).json({
                success: true,
                message: 'Sesión actual terminada. Se requiere un nuevo inicio de sesión.',
                requireLogin: true
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Sesión terminada correctamente'
        });
    } catch (error) {
        logger.error(`Error al terminar sesión: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Error al terminar la sesión'
        });
    }
};

/**
 * Cerrar todas las sesiones excepto la actual
 */
exports.terminateAllOtherSessions = async (req, res) => {
    try {
        const userId = req.user._id;
        const currentDeviceId = req.cookies.device_id;

        if (!currentDeviceId) {
            return res.status(400).json({
                success: false,
                message: 'No se puede identificar la sesión actual'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Mantener solo la sesión actual
        user.removeAllSessionsExcept(currentDeviceId);
        await user.save();

        // Revocar todos los tokens de refresco excepto el actual
        const currentRefreshToken = req.cookies.refresh_token;
        if (currentRefreshToken) {
            await RefreshToken.updateMany(
                {
                    user: userId,
                    token: { $ne: currentRefreshToken },
                    isActive: true
                },
                { isActive: false, revokedAt: new Date() }
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Todas las otras sesiones han sido terminadas'
        });
    } catch (error) {
        logger.error(`Error al terminar otras sesiones: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Error al terminar las otras sesiones'
        });
    }
};

/**
 * Actualizar datos de la sesión actual (como ubicación)
 */
exports.updateSessionInfo = async (req, res) => {
    try {
        const userId = req.user._id;
        const deviceId = req.cookies.device_id;
        const { location } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'No se puede identificar la sesión actual'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Buscar la sesión actual
        const sessionIndex = user.activeSessions.findIndex(
            session => session.deviceId === deviceId
        );

        if (sessionIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Sesión no encontrada'
            });
        }

        // Actualizar información de la sesión
        if (location) {
            user.activeSessions[sessionIndex].location = location;
        }

        // Actualizar timestamp de última actividad
        user.activeSessions[sessionIndex].lastActivity = new Date();

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Información de sesión actualizada'
        });
    } catch (error) {
        logger.error(`Error al actualizar información de sesión: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar la información de sesión'
        });
    }
};