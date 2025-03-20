// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    // Verificar expiración
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      logger.info('Token has expired')
      return res.status(401).json({ message: "Token has expired" });
    }

    // Buscar usuario una sola vez
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      logger.info('User no longer exists')
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Guardar el usuario en req para usarlo en rutas posteriores
    req.user = user;
    next();
  } catch (error) {
    logger.error("Token verification error:", error);
    res.status(401).json({ message: "Token is not valid" });
  }
};


module.exports = authMiddleware;
