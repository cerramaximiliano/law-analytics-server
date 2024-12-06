const { sendEmail } = require("../services/emailService");
const logger = require("../utils/logger");

// Controlador para enviar correos electrónicos
const sendEmailController = async (req, res) => {
  const { to, textBody, subject } = req.body;

  // Validación de parámetros requeridos
  if (!to || !textBody) {
    logger.warn("Faltan parámetros requeridos para enviar el correo.");
    return res.status(400).json({ error: "Se requiere 'to' y 'textBody'" });
  }

  const htmlBody = `<p>${textBody}</p>`; // Convierte el texto a HTML básico

  try {
    const result = await sendEmail(to, subject, htmlBody, textBody);
    logger.info(`Correo enviado exitosamente a ${to}`);
    res.status(200).json({ message: "Correo enviado exitosamente", result });
  } catch (error) {
    logger.error(`Error al enviar correo a ${to}:`, error);
    res
      .status(500)
      .json({ error: "Error al enviar el correo", details: error.message });
  }
};

module.exports = { sendEmailController };
