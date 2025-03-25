// src/controllers/supportContactController.js o controllers/supportContactController.js
const SupportContact = require('../models/SupportContact');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

// Crear un nuevo contacto de soporte
exports.createSupportContact = async (req, res) => {
  try {
    const { name, email, subject, priority, message } = req.body;

    // Crear nuevo contacto
    const newContact = new SupportContact({
      name,
      email,
      subject,
      priority,
      message
    });

    // Guardar en base de datos
    await newContact.save();

    // Enviar email de confirmación al usuario
    await sendConfirmationEmail(name, email, subject);

    // Enviar email de notificación al equipo de soporte
    await notifySupport(newContact);

    res.status(201).json({
      success: true,
      data: newContact,
      message: 'Contacto de soporte creado correctamente'
    });
  } catch (error) {
    logger.error('Error al crear contacto de soporte:', error);
    
    // Manejar errores de validación de mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error del servidor'
    });
  }
};

// Obtener todos los contactos de soporte (admin)
exports.getAllSupportContacts = async (req, res) => {
  try {
    // Parámetros de paginación y filtrado
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const filters = {};
    
    // Aplicar filtros si existen
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    
    // Contar total de documentos para paginación
    const total = await SupportContact.countDocuments(filters);
    
    // Obtener contactos con paginación y filtrado
    const contacts = await SupportContact.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email');
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: contacts
    });
  } catch (error) {
    logger.error('Error al obtener contactos de soporte:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor'
    });
  }
};

// Obtener un contacto de soporte específico
exports.getSupportContact = async (req, res) => {
  try {
    const contact = await SupportContact.findById(req.params.id)
      .populate('assignedTo', 'name email');
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contacto de soporte no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    logger.error('Error al obtener contacto de soporte:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor'
    });
  }
};

// Actualizar estado de un contacto de soporte (admin)
exports.updateSupportContact = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    
    // Buscar y actualizar
    const contact = await SupportContact.findByIdAndUpdate(
      req.params.id,
      { status, assignedTo },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contacto de soporte no encontrado'
      });
    }
    
    // Si el estado cambió a 'resolved', notificar al usuario
    if (status === 'resolved') {
      await sendResolutionEmail(contact);
    }
    
    res.status(200).json({
      success: true,
      data: contact,
      message: 'Contacto de soporte actualizado correctamente'
    });
  } catch (error) {
    logger.error('Error al actualizar contacto de soporte:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor'
    });
  }
};

// Eliminar un contacto de soporte (admin)
exports.deleteSupportContact = async (req, res) => {
  try {
    const contact = await SupportContact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contacto de soporte no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Contacto de soporte eliminado correctamente'
    });
  } catch (error) {
    logger.error('Error al eliminar contacto de soporte:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor'
    });
  }
};

// Función auxiliar: Enviar email de confirmación al usuario utilizando AWS SES
async function sendConfirmationEmail(name, email, subject) {
  try {
    // Asunto del correo
    const emailSubject = 'Tu consulta ha sido recibida';
    
    // Contenido HTML del correo
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hemos recibido tu consulta</h2>
      <p>Hola ${name},</p>
      <p>Queremos confirmarte que hemos recibido tu consulta sobre "${subject}".</p>
      <p>Nuestro equipo de soporte revisará tu mensaje y te responderá en un plazo máximo de 24 horas hábiles.</p>
      <p>Si tienes alguna pregunta adicional, puedes responder directamente a este correo.</p>
      <p>Gracias por contactarnos.</p>
      <p>Saludos cordiales,<br>El equipo de soporte</p>
    </div>
    `;
    
    // Contenido de texto plano
    const textBody = `
    Hemos recibido tu consulta
    
    Hola ${name},
    
    Queremos confirmarte que hemos recibido tu consulta sobre "${subject}".
    
    Nuestro equipo de soporte revisará tu mensaje y te responderá en un plazo máximo de 24 horas hábiles.
    
    Si tienes alguna pregunta adicional, puedes responder directamente a este correo.
    
    Gracias por contactarnos.
    
    Saludos cordiales,
    El equipo de soporte
    `;
    
    await sendEmail(email, emailSubject, htmlBody, textBody);
    logger.info(`Correo de confirmación enviado a ${email}`);
  } catch (error) {
    logger.error('Error al enviar email de confirmación:', error);
    // No lanzamos el error para que no interrumpa el flujo principal
  }
}

// Función auxiliar: Notificar al equipo de soporte
async function notifySupport(contact) {
  try {
    // Email de soporte (puede estar en variables de entorno)
    const supportEmail = process.env.SUPPORT_EMAIL || 'soporte@lawanalytics.app';
    
    // Asunto del correo
    const emailSubject = `Nueva consulta de soporte: ${contact.subject}`;
    
    // Formato de prioridad para mejor legibilidad
    let priorityText = 'Media';
    switch(contact.priority) {
      case 'low': priorityText = 'Baja'; break;
      case 'high': priorityText = 'Alta'; break;
      case 'urgent': priorityText = 'Urgente'; break;
    }
    
    // Contenido HTML del correo
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Nueva consulta de soporte recibida</h2>
      <p><strong>ID:</strong> ${contact._id}</p>
      <p><strong>De:</strong> ${contact.name} (${contact.email})</p>
      <p><strong>Asunto:</strong> ${contact.subject}</p>
      <p><strong>Prioridad:</strong> ${priorityText}</p>
      <p><strong>Fecha:</strong> ${new Date(contact.createdAt).toLocaleString()}</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Mensaje:</strong></p>
        <p>${contact.message.replace(/\n/g, '<br>')}</p>
      </div>
      <p>Por favor, revisa esta consulta y asígnala a un miembro del equipo.</p>
    </div>
    `;
    
    // Contenido de texto plano
    const textBody = `
    Nueva consulta de soporte recibida
    
    ID: ${contact._id}
    De: ${contact.name} (${contact.email})
    Asunto: ${contact.subject}
    Prioridad: ${priorityText}
    Fecha: ${new Date(contact.createdAt).toLocaleString()}
    
    Mensaje:
    ${contact.message}
    
    Por favor, revisa esta consulta y asígnala a un miembro del equipo.
    `;
    
    await sendEmail(supportEmail, emailSubject, htmlBody, textBody);
    logger.info(`Notificación enviada al equipo de soporte: ${supportEmail}`);
  } catch (error) {
    logger.error('Error al notificar al equipo de soporte:', error);
    // No lanzamos el error para que no interrumpa el flujo principal
  }
}

// Función auxiliar: Enviar email de resolución al usuario
async function sendResolutionEmail(contact) {
  try {
    // Asunto del correo
    const emailSubject = 'Tu consulta ha sido resuelta';
    
    // Contenido HTML del correo
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Tu consulta ha sido resuelta</h2>
      <p>Hola ${contact.name},</p>
      <p>Queremos informarte que tu consulta sobre "${contact.subject}" ha sido marcada como resuelta.</p>
      <p>Si consideras que el problema persiste o necesitas asistencia adicional, no dudes en responder a este correo.</p>
      <p>Agradecemos tu confianza y estamos a tu disposición para cualquier consulta futura.</p>
      <p>Saludos cordiales,<br>El equipo de soporte</p>
    </div>
    `;
    
    // Contenido de texto plano
    const textBody = `
    Tu consulta ha sido resuelta
    
    Hola ${contact.name},
    
    Queremos informarte que tu consulta sobre "${contact.subject}" ha sido marcada como resuelta.
    
    Si consideras que el problema persiste o necesitas asistencia adicional, no dudes en responder a este correo.
    
    Agradecemos tu confianza y estamos a tu disposición para cualquier consulta futura.
    
    Saludos cordiales,
    El equipo de soporte
    `;
    
    await sendEmail(contact.email, emailSubject, htmlBody, textBody);
    logger.info(`Correo de resolución enviado a ${contact.email}`);
  } catch (error) {
    logger.error('Error al enviar email de resolución:', error);
    // No lanzamos el error para que no interrumpa el flujo principal
  }
}