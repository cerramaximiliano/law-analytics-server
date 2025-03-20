const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const { sendEmail } = require("../services/emailService");
const { OAuth2Client } = require("google-auth-library");
const UserAlertStatus = require("../models/UserAlertStatus");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    res.status(201).json({
      user: filterUserData(user),
      serviceToken: token,
      needsVerification: true,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Email y/o password inválidos" });
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

    const token = generateToken(user);


    // Configuración de cookie flexible
    const isLocalDevelopment = req.headers.origin?.includes('localhost') || 
                              req.headers.origin?.includes('127.0.0.1');
    
    const cookieOptions = {
      maxAge: 3 * 60 * 60 * 1000,
      httpOnly: true,
      path: '/',
    };
    
    if (isLocalDevelopment) {
      // Configuración para desarrollo local
      cookieOptions.secure = false;
      cookieOptions.sameSite = 'lax';
    } else {
      // Configuración para entornos de producción
      cookieOptions.secure = true;
      cookieOptions.sameSite = 'none';
    }
    
    res.cookie('access_token', token, cookieOptions);


    // También enviar el token en la respuesta JSON para compatibilidad con el código existente
    res.json({
      user: filterUserData({ ...user.toObject(), ...updatedData }),
      serviceToken: token,
    });
  } catch (error) {
    logger.error(error)
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ user: filterUserData(user) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
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
    logger.error(error);
    res.status(500).json({ message: "Error del servidor", error });
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

    const jwt = generateToken(user);



    // Configuración de cookie flexible
    const isLocalDevelopment = req.headers.origin?.includes('localhost') || 
                              req.headers.origin?.includes('127.0.0.1');
    
    const cookieOptions = {
      maxAge: 3 * 60 * 60 * 1000,
      httpOnly: true,
      path: '/',
    };
    
    if (isLocalDevelopment) {
      // Configuración para desarrollo local
      cookieOptions.secure = false;
      cookieOptions.sameSite = 'lax';
    } else {
      // Configuración para entornos de producción
      cookieOptions.secure = true;
      cookieOptions.sameSite = 'none';
    }
    
    res.cookie('access_token', jwt, cookieOptions);

    
    res.json({
      success: true,
      serviceToken: jwt,
      user: filterUserData(user),
    });
  } catch (error) {
    logger.error("Error en autenticación:", error);
    res
      .status(500)
      .json({ success: false, message: "Error en la autenticación" });
  }
};
