const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const { sendEmail } = require("../services/emailService");
const { OAuth2Client } = require("google-auth-library");
const UserAlertStatus = require("../models/UserAlertStatus");
const tokenService = require("../services/tokenService");
const RefreshToken = require("../models/RefreshToken");

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
    }

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
      // Cambiar a 403 Forbidden para indicar credenciales inválidas
      return res.status(403).json({
        message: "Credenciales inválidas",
        loginFailed: true  // Añadir bandera para manejar en el cliente
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

    res.cookie(TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: !isLocalDevelopment,
      sameSite: isLocalDevelopment ? 'lax' : 'none',
      maxAge: 10 * 60 * 1000 // 30 minutos
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
    user.verificationCode = null;
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
    logger.info("Refresh token recibido", refreshToken)
    if (!refreshToken) {
      return res.status(403).json({
        message: "No se encontró token de refresco",
        requireLogin: true  // Indica que necesita inicio de sesión
      });
    }

    try {
      const tokens = await tokenService.refreshTokens(refreshToken, req, res);

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
    // Obtener token de refresco de la cookie
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
      // Invalidar token de refresco en base de datos
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isActive: false, revokedAt: new Date() }
      );
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