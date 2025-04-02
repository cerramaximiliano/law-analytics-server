const Folder = require("../models/Folder");
const StatusHistory = require("../models/StatusHistory");
const mongoose = require("mongoose");

/**
 * Servicio para manejar operaciones relacionadas con carpetas
 * Incluye funcionalidad para registrar cambios de estado
 */
const folderService = {
  /**
   * Actualiza el estado de una carpeta y registra el cambio en el historial
   * @param {string} folderId - ID de la carpeta
   * @param {string} newStatus - Nuevo estado ('Nueva', 'En Proceso', 'Cerrada', 'Pendiente')
   * @param {string} userId - ID del usuario que realiza el cambio
   * @param {string} notes - Notas opcionales sobre el cambio
   * @returns {Object} La carpeta actualizada
   */
  updateFolderStatus: async (folderId, newStatus, userId, notes = "") => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Obtener la carpeta actual
      const folder = await Folder.findById(folderId).session(session);
      
      if (!folder) {
        throw new Error("Carpeta no encontrada");
      }
      
      const previousStatus = folder.status;
      
      // No registrar si el estado no cambia
      if (previousStatus === newStatus) {
        await session.abortTransaction();
        session.endSession();
        return folder;
      }
      
      // Calcular duración del estado anterior
      let duration = null;
      if (previousStatus) {
        // Buscar el último cambio de estado para esta carpeta
        const lastStatusChange = await StatusHistory.findOne(
          { folderId: folder._id },
          {},
          { sort: { createdAt: -1 } }
        ).session(session);
        
        if (lastStatusChange) {
          duration = Date.now() - new Date(lastStatusChange.createdAt).getTime();
        } else {
          // Si no hay registros anteriores, usar la fecha de creación de la carpeta
          duration = Date.now() - new Date(folder.createdAt).getTime();
        }
      }
      
      // Crear registro de historial
      await StatusHistory.create(
        [{
          folderId: folder._id,
          previousStatus,
          newStatus,
          changedBy: userId,
          notes,
          duration
        }],
        { session }
      );
      
      // Actualizar el estado de la carpeta
      folder.status = newStatus;
      await folder.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return folder;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  /**
   * Obtiene el historial de cambios de estado de una carpeta
   * @param {string} folderId - ID de la carpeta
   * @returns {Array} Historial de cambios de estado
   */
  getFolderStatusHistory: async (folderId) => {
    return StatusHistory.find({ folderId })
      .sort({ createdAt: -1 })
      .populate('changedBy', 'firstname lastname email')
      .lean();
  },
  
  /**
   * Analiza la duración promedio de cada estado para todas las carpetas
   * @returns {Object} Duración promedio por estado en milisegundos
   */
  getAverageStatusDuration: async () => {
    const result = await StatusHistory.aggregate([
      { $match: { duration: { $exists: true, $ne: null } } },
      { $group: {
          _id: "$previousStatus",
          averageDuration: { $avg: "$duration" },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convertir a formato más amigable
    return result.reduce((acc, item) => {
      if (item._id) {  // Solo incluir estados válidos
        acc[item._id] = {
          // Convertir a horas (ms a horas)
          averageDurationHours: item.averageDuration / (1000 * 60 * 60),
          // Convertir a días (ms a días)
          averageDurationDays: item.averageDuration / (1000 * 60 * 60 * 24),
          count: item.count
        };
      }
      return acc;
    }, {});
  },
  
  /**
   * Obtiene estadísticas detalladas de una carpeta específica
   * @param {string} folderId - ID de la carpeta
   * @returns {Object} Estadísticas de la carpeta
   */
  getFolderStatusStats: async (folderId) => {
    const history = await StatusHistory.find({ folderId }).sort({ createdAt: 1 }).lean();
    
    if (!history.length) {
      return { totalDuration: 0, statesDuration: {}, transitions: [] };
    }
    
    // Calcular duración por estado
    const statesDuration = history.reduce((acc, record) => {
      if (record.previousStatus && record.duration) {
        if (!acc[record.previousStatus]) {
          acc[record.previousStatus] = 0;
        }
        acc[record.previousStatus] += record.duration;
      }
      return acc;
    }, {});
    
    // Añadir el estado actual (que aún no ha terminado)
    const folder = await Folder.findById(folderId);
    if (folder) {
      const lastHistory = history[history.length - 1];
      const currentStateDuration = Date.now() - new Date(lastHistory.createdAt).getTime();
      
      if (!statesDuration[folder.status]) {
        statesDuration[folder.status] = 0;
      }
      statesDuration[folder.status] += currentStateDuration;
    }
    
    // Formatear duraciones para mejor legibilidad
    const formattedDurations = {};
    let totalDuration = 0;
    
    Object.keys(statesDuration).forEach(state => {
      const durationMs = statesDuration[state];
      totalDuration += durationMs;
      
      formattedDurations[state] = {
        milliseconds: durationMs,
        seconds: durationMs / 1000,
        minutes: durationMs / (1000 * 60),
        hours: durationMs / (1000 * 60 * 60),
        days: durationMs / (1000 * 60 * 60 * 24)
      };
    });
    
    return {
      totalDuration: {
        milliseconds: totalDuration,
        seconds: totalDuration / 1000,
        minutes: totalDuration / (1000 * 60),
        hours: totalDuration / (1000 * 60 * 60),
        days: totalDuration / (1000 * 60 * 60 * 24)
      },
      statesDuration: formattedDurations,
      transitions: history.map(h => ({
        from: h.previousStatus || 'Inicial',
        to: h.newStatus,
        date: h.createdAt,
        duration: h.duration ? {
          milliseconds: h.duration,
          hours: h.duration / (1000 * 60 * 60),
          days: h.duration / (1000 * 60 * 60 * 24)
        } : null,
        changedBy: h.changedBy,
        notes: h.notes
      }))
    };
  }
};

module.exports = folderService;