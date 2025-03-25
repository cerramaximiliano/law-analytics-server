// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const moment = require("moment")

const TOKEN_COOKIE_NAME = 'auth_token';

const authMiddleware = async (req, res, next) => {
  // Obtener token de acceso de las cookies
  const token = req.cookies?.[TOKEN_COOKIE_NAME];



  if (!token) {
    logger.warn(`Middleware auth: Token no encontrado`)
    return res.status(401).json({
      message: "No token, authorization denied",
      needRefresh: true
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    if(decoded.id){
        logger.info(`Token recibido correctamente - Creación: ${moment.unix(decoded.iat).format('DD/MM/YYYY HH:mm:ss')} - Expiración: ${moment.unix(decoded.exp).format('DD/MM/YYYY HH:mm:ss')}`)
    }

    // Verificar expiración
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      logger.warn(`Middleware auth: Token expirado`)
      return res.status(401).json({
        message: "Token has expired",
        needRefresh: true
      });
    }

    // Buscar usuario
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      logger.warn(`Middleware auth: Usuario no encontrado`)
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Guardar el usuario en req para usarlo en rutas posteriores
    req.user = user;
    next();
  } catch (error) {
    logger.error("Middleware auth: Token verification error:", error);
    res.status(401).json({
      message: "Token is not valid",
      needRefresh: true
    });
  }
};

module.exports = authMiddleware;