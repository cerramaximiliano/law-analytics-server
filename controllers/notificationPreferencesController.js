const User = require("../models/User");
const logger = require("../utils/logger");


/**
 * Obtener preferencias de notificaciones del usuario actual
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Seleccionamos los campos relevantes incluyendo timeZone y dateFormat
    const user = await User.findById(userId).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Si el usuario no tiene preferencias, devolver un objeto vacío
    if (!user.preferences) {
      return res.status(200).json({
        success: true,
        data: {}
      });
    }
    
    // Convertir a un objeto JavaScript plano (por si es un documento Mongoose)
    const preferencesObj = user.preferences.toObject ? user.preferences.toObject() : user.preferences;
    
    // Extraer las propiedades de notificaciones
    const notificationsData = preferencesObj.notifications || {};
    
    // Crear el objeto de respuesta con timeZone y dateFormat al mismo nivel
    const responseData = {
      ...notificationsData,
      timeZone: preferencesObj.timeZone,
      dateFormat: preferencesObj.dateFormat
    };
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error(`Error al obtener preferencias de notificaciones: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener preferencias de notificaciones',
      error: error.message
    });
  }
};
/**
 * Actualizar preferencias de notificaciones
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const userPreferences = req.body;
    console.log("Datos recibidos para actualizar:", userPreferences);

    // Verificar que el cuerpo de la petición es válido
    if (!userPreferences) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren datos para actualizar las preferencias'
      });
    }

    // Buscar al usuario con toda su estructura actual
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Asegurarse de que existe el objeto de preferencias
    if (!user.preferences) {
      user.preferences = {};
    }

    // Inicializar el objeto de notificaciones si es necesario
    if (userPreferences.notifications && !user.preferences.notifications) {
      user.preferences.notifications = {};
    }

    // Usar findOneAndUpdate para actualizar directamente solo los campos enviados
    const updateOperation = { $set: {} };

    // Determinar si las propiedades pertenecen al nivel superior de preferencias o a notificaciones
    Object.keys(userPreferences).forEach(key => {
      if (key === 'notifications') {
        // Si es el objeto notifications, actualizamos cada propiedad dentro de notifications
        if (typeof userPreferences.notifications === 'object') {
          Object.keys(userPreferences.notifications).forEach(notifKey => {
            updateOperation.$set[`preferences.notifications.${notifKey}`] = userPreferences.notifications[notifKey];
          });
        }
      } else if (key === 'loginAlerts') {
        // Manejo especial para loginAlerts, que pertenece a notifications según el esquema
        updateOperation.$set[`preferences.notifications.loginAlerts`] = userPreferences.loginAlerts;
      } else {
        // Otras propiedades van directamente en preferences
        updateOperation.$set[`preferences.${key}`] = userPreferences[key];
      }
    });

    console.log("Operación de actualización:", updateOperation);

    // Realizar la actualización
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      updateOperation,
      { new: true, runValidators: false } // Obtener el documento actualizado
    );

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar las preferencias'
      });
    }

    logger.info(`Preferencias actualizadas para el usuario: ${userId}`);

    // Devolver las preferencias completas
    return res.status(200).json({
      success: true,
      data: updatedUser.preferences,
      message: 'Preferencias actualizadas correctamente'
    });
  } catch (error) {
    logger.error(`Error al actualizar preferencias: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar preferencias',
      error: error.message
    });
  }
};
