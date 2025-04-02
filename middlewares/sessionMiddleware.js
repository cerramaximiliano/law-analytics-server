// middleware/sessionMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const DeviceDetector = require('node-device-detector');
const deviceDetector = new DeviceDetector();

/**
 * Middleware para registrar la sesión actual del usuario
 */
exports.trackSession = async (req, res, next) => {
  try {
    // Solo proceder si el usuario está autenticado
    if (!req.user || !req.user._id) {
      return next();
    }

    const userId = req.user._id;
    
    // Obtener información del dispositivo y navegador
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = deviceDetector.detect(userAgent);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Obtener o crear un ID de dispositivo
    let deviceId = req.cookies.device_id;
    
    if (!deviceId) {
      deviceId = uuidv4();
      
      // Establecer cookie de ID de dispositivo
      const isLocalDevelopment = req.headers.origin?.includes('localhost') ||
        req.headers.origin?.includes('127.0.0.1');
      
      res.cookie('device_id', deviceId, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
        httpOnly: true,
        secure: !isLocalDevelopment,
        sameSite: isLocalDevelopment ? 'lax' : 'none'
      });
    }
    
    // Preparar datos de la sesión
    const sessionData = {
      deviceId,
      deviceName: deviceInfo.device?.type || 'Desconocido',
      deviceType: deviceInfo.device?.type || 'desktop',
      browser: deviceInfo.client?.name || 'Desconocido',
      os: deviceInfo.os?.name || 'Desconocido',
      ip,
      lastActivity: new Date(),
      location: req.body.location || '', // Si la app cliente envía la ubicación
      token: req.cookies.auth_token || '',
      isCurrentSession: true
    };
    
    // Buscar al usuario y actualizar su sesión
    const user = await User.findById(userId);
    if (!user) {
      return next();
    }
    
    // Marcar todas las demás sesiones como no-actuales
    if (user.activeSessions) {
      user.activeSessions.forEach(session => {
        if (session.deviceId !== deviceId) {
          session.isCurrentSession = false;
        }
      });
    }
    
    // Añadir o actualizar la sesión actual
    user.addSession(sessionData);
    await user.save();
    
    // Continuar con el siguiente middleware
    next();
  } catch (error) {
    logger.error(`Error en middleware de sesión: ${error}`);
    // No bloquear la petición en caso de error
    next();
  }
};

/**
 * Middleware para limpiar sesiones antiguas
 * Puede ejecutarse periódicamente o en ciertos endpoints
 */
exports.cleanupOldSessions = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next();
    }
    
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user || !user.activeSessions) {
      return next();
    }
    
    // Definir el límite de tiempo para sesiones inactivas (7 días)
    const inactivityLimit = new Date();
    inactivityLimit.setDate(inactivityLimit.getDate() - 7);
    
    // Filtrar las sesiones y mantener solo las activas
    user.activeSessions = user.activeSessions.filter(session => 
      session.lastActivity >= inactivityLimit || session.isCurrentSession
    );
    
    await user.save();
    next();
  } catch (error) {
    logger.error(`Error al limpiar sesiones antiguas: ${error}`);
    next();
  }
};