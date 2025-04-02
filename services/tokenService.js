// services/tokenService.js
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const logger = require('../utils/logger');

const TOKEN_COOKIE_NAME = 'auth_token';

class TokenService {
  // Configuración de cookies
  getCookieOptions(isSecure = false) {
    return {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    };
  }

  // Generar token de acceso
  generateAccessToken(user) {
    return jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1m' }
    );
  }

  // Generar token de refresco
  async generateRefreshToken(user, res = null, isSecure = false) {
    // Invalidar tokens de refresco anteriores
    await RefreshToken.updateMany(
      { user: user._id, isActive: true },
      { isActive: false, revokedAt: new Date() }
    );

    // Crear nuevo token de refresco
    const refreshTokenString = uuidv4();
    const refreshToken = new RefreshToken({
      user: user._id,
      token: refreshTokenString,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
    });

    await refreshToken.save();

    // Establecer cookie de refresco solo si se pasa el objeto res
    if (res) {
      const cookieOptions = this.getCookieOptions(isSecure);
      res.cookie('refresh_token', refreshTokenString, cookieOptions);
    }

    return refreshTokenString;
  }

  async cleanupExpiredTokens(daysToKeepRevoked = 1) {
    try {
      const now = new Date();

      // Establecer límite de tiempo para tokens revocados
      const revokedLimit = new Date();
      revokedLimit.setDate(revokedLimit.getDate() - daysToKeepRevoked);

      // Eliminar tokens expirados y tokens revocados antiguos
      const result = await RefreshToken.deleteMany({
        $or: [
          { expiresAt: { $lt: now } },
          {
            revokedAt: { $lt: revokedLimit },
            isActive: false
          }
        ]
      });

      logger.info(`Limpieza de tokens completada: ${result.deletedCount} tokens eliminados`);
      return result.deletedCount;
    } catch (error) {
      logger.error(`Error al limpiar tokens de refresco: ${error.message}`);
      throw error;
    }
  }
  // Verificar y renovar tokens
  async refreshTokens(refreshToken, req, res) {
    // Buscar token de refresco
    const storedToken = await RefreshToken.findOne({
      token: refreshToken
    });

    // Si el token no existe, lanzar error
    if (!storedToken) {
      logger.error(`Token de refresco inválido`);
      throw new Error('Token de refresco inválido');
    }

    // Buscar usuario separadamente
    const user = await User.findById(storedToken.user);
    if (!user) {
      // Eliminar el token si el usuario no existe
      await RefreshToken.deleteOne({ _id: storedToken._id });
      logger.error(`Usuario no encontrado para el token de refresco - token eliminado`);
      throw new Error('Usuario no encontrado');
    }

    // Verificar expiración
    if (storedToken.expiresAt < new Date()) {
      // Eliminar el token expirado
      await RefreshToken.deleteOne({ _id: storedToken._id });

      // Opcional: también podemos limpiar otros tokens expirados del mismo usuario
      const now = new Date();
      await RefreshToken.deleteMany({
        user: user._id,
        expiresAt: { $lt: now }
      });

      logger.error(`Token de refresco expirado - token eliminado`);
      throw new Error('Token de refresco expirado');
    }

    // Verificar si el token está activo
    if (!storedToken.isActive) {
      // Opcional: eliminar este token inactivo si tiene más de un día
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      if (storedToken.revokedAt && storedToken.revokedAt < oneDayAgo) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        logger.info(`Token inactivo antiguo eliminado`);
      }

      logger.error(`Token de refresco revocado`);
      throw new Error('Token de refresco revocado');
    }

    // Determinar si es entorno de desarrollo
    const isLocalDevelopment = req.headers.origin?.includes('localhost') ||
      req.headers.origin?.includes('127.0.0.1');

    // Generar nuevo token de acceso
    const newAccessToken = this.generateAccessToken(user);

    // Configurar cookie de acceso
    res.cookie(TOKEN_COOKIE_NAME, newAccessToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 30 * 60 * 1000 // 30 minutos
    });

    // Periódicamente (10% de las veces) hacer limpieza de tokens expirados
    if (Math.random() < 0.1) {
      this.cleanupExpiredTokens().catch(err =>
        logger.warn(`Error en limpieza automática de tokens: ${err.message}`)
      );
    }

    return {
      accessToken: newAccessToken
    };
  }
}

module.exports = new TokenService();