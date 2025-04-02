const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const { sendEmail } = require("../services/emailService");
const { OAuth2Client } = require("google-auth-library");
const UserAlertStatus = require("../models/UserAlertStatus");
const tokenService = require("../services/tokenService");
const RefreshToken = require("../models/RefreshToken");
const bcrypt = require("bcrypt");
const DeviceDetector = require('node-device-detector');
const deviceDetector = new DeviceDetector();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const TOKEN_COOKIE_NAME = 'auth_token';
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

const getCookieConfig = (req) => {
  const isLocalDevelopment = req.headers.origin?.includes('localhost') ||
    req.headers.origin?.includes('127.0.0.1');

  return {
    maxAge: 3 * 60 * 60 * 1000, // 3 horas
    httpOnly: true,
    path: '/',
    secure: !isLocalDevelopment,
    sameSite: isLocalDevelopment ? 'lax' : 'none'
  };
};

const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    logger.error("Error al verificar el token de Google:", error);
    return null;
  }
};

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    logger.error("JWT_SECRET no está definido en las variables de entorno");
    throw new Error("No se puede generar el token: clave secreta no configurada");
  }

  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3h",
    algorithm: "HS256",
  });
};

const filterUserData = (user) => {
  // Filtrar los datos válidos del usuario para responder al frontend
  return {
    _id: user._id,
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    picture: user.picture,
    address: user.address,
    address1: user.address1,
    avatar: user.avatar,
    contact: user.contact,
    country: user.country,
    profileCompletionScore: user.profileCompletionScore,
    designation: user.designation,
    dob: user.dob,
    note: user.note,
    role: user.role,
    skill: user.skill,
    state: user.state,
    subscription: user.subscription,
    tier: user.tier,
    users: user.users,
    url: user.url,
    zipCode: user.zipCode,
  };
};

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "El usuario ya existe. Resetee el password si no lo recuerda.",
      });
    };

    // Descomentar cuando se implemente en el cliente
    //const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    /*     if (!passwordRegex.test(password)) {
          return res.status(400).json({
            success: false,
            message: 'La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, una minúscula, un número y un carácter especial'
          });
        } */

    const user = new User({
      email,
      password,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
    });
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    user.verificationCode = verificationCode;
    await user.save();

    const subject = "Law||Analytics - Código de Verificación de tu Cuenta";
    const htmlBody = `<p>Hola ${firstName},</p><p>Gracias por registrarte. Tu código de verificación es: <strong>${verificationCode}</strong></p><p>Ingresa este código en la aplicación para verificar tu cuenta.</p>`;
    const textBody = `Hola ${firstName},\n\nGracias por registrarte. Tu código de verificación es: ${verificationCode}\n\nIngresa este código en la aplicación para verificar tu cuenta.`;

    await sendEmail(email, subject, htmlBody, textBody);

    const token = generateToken(user);

    res.cookie(TOKEN_COOKIE_NAME, token, getCookieConfig(req));

    res.status(201).json({
      user: filterUserData(user),
      token: token,
      needsVerification: true,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error del servidor, intente más tarde" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(403).json({
        message: "Credenciales inválidas",
        loginFailed: true
      });
    }

    // Verificar si la cuenta está activa
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Esta cuenta ha sido desactivada. Por favor contacta con soporte o intenta reactivarla.",
        accountDeactivated: true
      });
    }

    let updatedData = {};
    if (!user.name && user.firstName && user.family_name) {
      updatedData.name = `${user.firstName} ${user.family_name}`;
    }
    if (!user.picture) {
      updatedData.picture = "ruta/default.jpg";
    }

    if (Object.keys(updatedData).length > 0) {
      await User.findByIdAndUpdate(
        user._id,
        { $set: updatedData },
        { new: true }
      );
    }

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = await tokenService.generateRefreshToken(user);

    // Configuración de cookie flexible
    const isLocalDevelopment = req.headers.origin?.includes('localhost') ||
      req.headers.origin?.includes('127.0.0.1');

    // Generar un ID de dispositivo si no existe
    let deviceId = req.cookies.device_id;
    if (!deviceId) {
      deviceId = require('uuid').v4();
      res.cookie('device_id', deviceId, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
        httpOnly: true,
        secure: !isLocalDevelopment,
        sameSite: isLocalDevelopment ? 'lax' : 'none'
      });
    }

    // Registrar la información de la sesión
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = deviceDetector.detect(userAgent);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const sessionData = {
      deviceId,
      deviceName: deviceInfo.device?.type || 'Desconocido',
      deviceType: deviceInfo.device?.type || 'desktop',
      browser: deviceInfo.client?.name || 'Desconocido',
      os: deviceInfo.os?.name || 'Desconocido',
      ip,
      lastActivity: new Date(),
      location: req.body.location || '',
      token: accessToken,
      isCurrentSession: true
    };

    // Marcar las sesiones antiguas como no actuales
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

    res.cookie(TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 30 * 60 * 1000 // 30 minutos
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // Enviar respuesta con código 200
    res.status(200).json({
      user: filterUserData({ ...user.toObject(), ...updatedData }),
      accessToken,
      refreshToken,
      message: "Inicio de sesión exitoso"
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      message: "Error del servidor, intente más tarde",
      serverError: true
    });
  }
};

exports.getProfile = async (req, res) => {

  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      logger.error(`Error al obtener perfil. Usuario no encontrado.`)
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ user: filterUserData(user) });
  } catch (error) {
    logger.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error al obtener el perfil. Intente nuevamente más tarde." });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado." });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({
        message: "Código de verificación incorrecto.",
        success: false,
      });
    }

    user.isVerified = true;

    await user.save();

    const userAlertStatus = new UserAlertStatus({
      userId: user._id,
      alertId: "672f55a9805e34439b556af2",
      isRead: false,
    });
    await userAlertStatus.save();

    res
      .status(200)
      .json({ message: "Cuenta verificada con éxito.", success: true });
  } catch (error) {
    logger.error("Error en verificación de código:", error);
    res.status(500).json({ message: "Error al verificar el código. Intente nuevamente más tarde." });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture } = payload;

    let user = await User.findOne({ email });
    
    // Si el usuario existe pero está desactivado, retornar error
    if (user && user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Esta cuenta ha sido desactivada. Por favor contacta con soporte o intenta reactivarla.",
        accountDeactivated: true
      });
    }
    
    const updateData = {};
    if (!user?.firstName && given_name) updateData.firstName = given_name;
    if (!user?.lastName && family_name) updateData.lastName = family_name;
    if (!user?.name && given_name && family_name)
      updateData.name = `${given_name} ${family_name}`;
    if (!user?.picture && picture) updateData.picture = picture;

    user = await User.findOneAndUpdate({ email }, updateData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = await tokenService.generateRefreshToken(user);

    const isLocalDevelopment = req.headers.origin?.includes('localhost') ||
      req.headers.origin?.includes('127.0.0.1');


    res.cookie(TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 10 * 60 * 1000 // 10 minutos
    });

    // Configurar cookie de refresh token
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: filterUserData(user),
    });
  } catch (error) {
    logger.error("Error en autenticación:", error);
    res
      .status(500)
      .json({ success: false, message: "Error en la autenticación" });
  }
};

exports.refreshTokens = async (req, res) => {
  try {
    // Obtener token de refresco de la cookie
    const refreshToken = req.cookies.refresh_token;
    const deviceId = req.cookies.device_id;

    if (!refreshToken) {
      return res.status(403).json({
        message: "No se encontró token de refresco",
        requireLogin: true  // Indica que necesita inicio de sesión
      });
    }

    try {
      // Verificar si el token existe en la base de datos
      const storedToken = await RefreshToken.findOne({ token: refreshToken });
      
      if (storedToken) {
        // Verificar si el usuario asociado está activo
        const user = await User.findById(storedToken.user);
        
        if (user && user.isActive === false) {
          // Revocar el token si el usuario está desactivado
          await RefreshToken.findOneAndUpdate(
            { token: refreshToken },
            { isActive: false, revokedAt: new Date() }
          );
          
          // Limpiar cookies
          res.clearCookie(TOKEN_COOKIE_NAME);
          res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
          
          return res.status(403).json({
            message: "Esta cuenta ha sido desactivada",
            accountDeactivated: true,
            requireLogin: true
          });
        }
      }
      
      const tokens = await tokenService.refreshTokens(refreshToken, req, res);

      // Actualizar la última actividad de la sesión si tenemos el ID de dispositivo
      if (deviceId) {
        // Obtener el ID de usuario del token
        const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Actualizar la última actividad
        const user = await User.findById(userId);
        if (user) {
          user.updateSessionActivity(deviceId);
          await user.save();
        }
      }

      res.status(200).json({
        message: "Tokens actualizados exitosamente",
        success: true
      });
    } catch (refreshError) {
      logger.error("Error refresh token", refreshError)
      return res.status(403).json({
        message: refreshError.message,
        requireLogin: true  // Indica que necesita inicio de sesión
      });
    }

  } catch (error) {
    logger.error("Error en refresh de tokens:", error);
    res.status(500).json({
      message: "Error interno al renovar tokens",
      needRefresh: true
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Obtener token de refresco e ID de dispositivo de la cookie
    const refreshToken = req.cookies.refresh_token;
    const deviceId = req.cookies.device_id;

    if (refreshToken) {
      // Invalidar token de refresco en base de datos
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isActive: false, revokedAt: new Date() }
      );
    }

    // Si tenemos ID de dispositivo y el usuario está autenticado, eliminar la sesión
    if (deviceId && req.user && req.user._id) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.removeSession(deviceId);
        await user.save();
      }
    }

    // Limpiar cookies
    res.clearCookie(TOKEN_COOKIE_NAME);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);

    res.json({ message: "Sesión cerrada exitosamente" });
  } catch (error) {
    logger.error(`Error en ruta /logout: ${error}`)
    res.status(500).json({ message: "Error al cerrar sesión" });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // Asume que el middleware de autenticación añade el usuario a req

    // Campos que se pueden actualizar
    const allowedFields = [
      'firstName', 'lastName', 'name', 'avatar', 'contact',
      'address', 'address1', 'country', 'state', 'zipCode',
      'designation', 'dob', 'note', 'skill', 'url'
    ];

    // Filtra solo los campos permitidos del request
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    console.log(updateData)

    // Buscar el usuario actual para verificar cambios
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // Actualizar el usuario y obtener el resultado actualizado
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true } // Para recibir el documento actualizado como respuesta
    );

    // Calcular el puntaje de completitud manualmente
    const completionScore = User.calculateCompletionScore(updatedUser);

    // Actualizar el puntaje de completitud si es necesario
    if (updatedUser.profileCompletionScore !== completionScore) {
      updatedUser.profileCompletionScore = completionScore;
      await updatedUser.save();
    }

    // Preparar la respuesta eliminando campos sensibles
    const userResponse = {
      _id: updatedUser._id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      contact: updatedUser.contact,
      address: updatedUser.address,
      address1: updatedUser.address1,
      country: updatedUser.country,
      state: updatedUser.state,
      zipCode: updatedUser.zipCode,
      designation: updatedUser.designation,
      dob: updatedUser.dob,
      note: updatedUser.note,
      skill: updatedUser.skill,
      url: updatedUser.url,
      profileCompletionScore: updatedUser.profileCompletionScore,
      // No incluimos campos sensibles como password
    };

    logger.info(`Usuario actualizado: ${userId}, nuevo puntaje de completitud: ${completionScore}%`);

    return res.status(200).json({
      success: true,
      data: userResponse,
      message: "Perfil actualizado correctamente"
    });

  } catch (error) {
    logger.error(`Error al actualizar perfil: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar el perfil",
      error: error.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren la contraseña actual y la nueva'
      });
    }

    // Obtener el ID del usuario desde el middleware de autenticación
    const userId = req.user._id;

    // Buscar el usuario en la base de datos
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que la contraseña actual sea correcta
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Validar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Validar requisitos de seguridad para la nueva contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, una minúscula, un número y un carácter especial'
      });
    }

    // Actualizar la contraseña
    user.password = newPassword;
    await user.save(); // El middleware en el modelo se encargará de hacer el hash

    logger.info(`Contraseña actualizada para el usuario: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    logger.error(`Error al cambiar contraseña: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar la contraseña',
      error: error.message
    });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return res.status(200).json({
        success: true,
        message: "Si el correo existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña."
      });
    }

    // Generar código de verificación de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar código y establecer tiempo de expiración (1 hora)
    user.verificationCode = resetCode;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    // Enviar email con código de verificación
    const subject = "Law||Analytics - Código para restablecer tu contraseña";
    const htmlBody = `
      <p>Hola ${user.firstName || ''},</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>Tu código de verificación es: <strong>${resetCode}</strong></p>
      <p>Este código expirará en 1 hora.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      <p>Saludos,<br/>El equipo de Law||Analytics</p>
    `;
    const textBody = `
      Hola ${user.firstName || ''},
      
      Recibimos una solicitud para restablecer la contraseña de tu cuenta.
      
      Tu código de verificación es: ${resetCode}
      
      Este código expirará en 1 hora.
      
      Si no solicitaste este cambio, puedes ignorar este correo.
      
      Saludos,
      El equipo de Law||Analytics
    `;

    await sendEmail(email, subject, htmlBody, textBody);

    logger.info(`Código de reseteo de contraseña enviado a: ${email}`);

    res.status(200).json({
      success: true,
      message: "Si el correo existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña."
    });
  } catch (error) {
    logger.error("Error al solicitar reseteo de contraseña:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud. Intente nuevamente más tarde."
    });
  }
};

// Verificar código de reseteo
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log(email, code)
    const user = await User.findOne({
      email,
      verificationCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Código inválido o expirado."
      });
    }

    // Código válido, permitir reseteo
    res.status(200).json({
      success: true,
      message: "Código verificado correctamente."
    });
  } catch (error) {
    logger.error("Error al verificar código de reseteo:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar el código. Intente nuevamente más tarde."
    });
  }
};

// Establecer nueva contraseña
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Validar requisitos de seguridad para la nueva contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, una minúscula, un número y un carácter especial'
      });
    }
    console.log(email, code, newPassword)
    const user = await User.findOne({
      email,
      verificationCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Código inválido o expirado."
      });
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Actualizar contraseña y limpiar campos de reseteo
    user.password = newPassword; // El middleware en el modelo se encargará de hacer el hash
    user.verificationCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    logger.info(`Contraseña restablecida exitosamente para: ${email}`);

    res.status(200).json({
      success: true,
      message: "Contraseña restablecida exitosamente."
    });
  } catch (error) {
    logger.error("Error al resetear contraseña:", error);
    res.status(500).json({
      success: false,
      message: "Error al restablecer la contraseña. Intente nuevamente más tarde."
    });
  }
};

exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Buscar el usuario
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar si el usuario ya tiene la propiedad isActive en false
    if (user.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'La cuenta ya está desactivada'
      });
    }
    
    // Requiere confirmación de contraseña por seguridad
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la contraseña para confirmar la desactivación de la cuenta'
      });
    }
    
    // Verificar la contraseña
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }
    
    // Marcar la cuenta como inactiva
    user.isActive = false;
    
    // Registrar la fecha de desactivación
    user.deactivatedAt = new Date();
    
    // Guardar el usuario
    await user.save();
    
    // Revocar todos los refresh tokens del usuario
    await RefreshToken.updateMany(
      { user: userId, isActive: true },
      { isActive: false, revokedAt: new Date() }
    );
    
    // Limpiar cookies
    res.clearCookie(TOKEN_COOKIE_NAME);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
    
    logger.info(`Cuenta desactivada: ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Cuenta desactivada correctamente'
    });
    
  } catch (error) {
    logger.error(`Error al desactivar cuenta: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al desactivar la cuenta',
      error: error.message
    });
  }
};

/**
 * Reactivar una cuenta previamente desactivada
 */
exports.reactivateAccount = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere email y contraseña'
      });
    }
    
    // Buscar el usuario - importante: incluir usuarios inactivos
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar si la cuenta está desactivada
    if (user.isActive !== false) {
      return res.status(400).json({
        success: false,
        message: 'La cuenta ya está activa'
      });
    }
    
    // Verificar la contraseña
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Reactivar la cuenta
    user.isActive = true;
    user.deactivatedAt = undefined; // Eliminar la fecha de desactivación
    
    // Guardar el usuario
    await user.save();
    
    // Generar nuevos tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = await tokenService.generateRefreshToken(user);
    
    // Configurar cookies
    const isLocalDevelopment = req.headers.origin?.includes('localhost') ||
      req.headers.origin?.includes('127.0.0.1');
    
    res.cookie(TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 30 * 60 * 1000 // 30 minutos
    });
    
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });
    
    logger.info(`Cuenta reactivada: ${user._id}`);
    
    return res.status(200).json({
      success: true,
      message: 'Cuenta reactivada correctamente',
      user: filterUserData(user),
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    logger.error(`Error al reactivar cuenta: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al reactivar la cuenta',
      error: error.message
    });
  }
};