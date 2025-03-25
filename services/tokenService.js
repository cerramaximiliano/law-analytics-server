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

  // Verificar y renovar tokens
  async refreshTokens(refreshToken, req, res) {
    // Buscar token de refresco
    const storedToken = await RefreshToken.findOne({ 
        token: refreshToken, 
        isActive: true 
    });

    if (!storedToken) {
        logger.error(`Token de refresco inválido`);
        throw new Error('Token de refresco inválido');
    }

    // Buscar usuario separadamente
    const user = await User.findById(storedToken.user);
    if (!user) {
        logger.error(`Usuario no encontrado para el token de refresco`);
        throw new Error('Usuario no encontrado');
    }

    // Verificar expiración
    if (storedToken.expiresAt < new Date()) {
        storedToken.isActive = false;
        await storedToken.save();
        logger.error(`Token de refresco expirado`);
        throw new Error('Token de refresco expirado');
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

    return { 
        accessToken: newAccessToken
    };
}
}

module.exports = new TokenService();