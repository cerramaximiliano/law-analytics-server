const processService = require("../services/processService");


/**
 * Controlador para gestionar el seguimiento procesal de expedientes
 */
const processController = {
  /**
   * Inicia una etapa procesal para un expediente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  startStage: async (req, res) => {
    try {
      const { folderId } = req.params;
      const { stageName, notes } = req.body;
      const userId = req.user?._id; // Asumiendo autenticación
      
      if (!folderId || !stageName) {
        return res.status(400).json({
          success: false,
          message: "Se requiere ID de expediente y nombre de etapa"
        });
      }
      
      const folder = await processService.startStage(
        folderId,
        stageName,
        userId,
        notes || ""
      );
      
      return res.status(200).json({
        success: true,
        message: `Etapa "${stageName}" iniciada correctamente`,
        folder
      });
    } catch (error) {
      console.error("Error al iniciar etapa procesal:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Error al iniciar la etapa procesal",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },
  
  /**
   * Finaliza la etapa actual de un expediente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  endCurrentStage: async (req, res) => {
    try {
      const { folderId } = req.params;
      const { notes } = req.body;
      const userId = req.user?._id; // Asumiendo autenticación
      
      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: "Se requiere ID de expediente"
        });
      }
      
      const folder = await processService.endCurrentStage(
        folderId,
        userId,
        notes || ""
      );
      
      return res.status(200).json({
        success: true,
        message: "Etapa actual finalizada correctamente",
        folder
      });
    } catch (error) {
      console.error("Error al finalizar etapa procesal:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Error al finalizar la etapa procesal",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },
  
  /**
   * Obtiene el historial de eventos procesales de un expediente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  getStageEvents: async (req, res) => {
    try {
      const { folderId } = req.params;
      
      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: "Se requiere ID de expediente"
        });
      }
      
      const events = await processService.getStageEvents(folderId);
      
      return res.status(200).json({
        success: true,
        events
      });
    } catch (error) {
      console.error("Error al obtener eventos procesales:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener eventos procesales",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },
  
  /**
   * Obtiene estadísticas del proceso para un expediente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  getProcessStats: async (req, res) => {
    try {
      const { folderId } = req.params;
      
      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: "Se requiere ID de expediente"
        });
      }
      
      const stats = await processService.getProcessStats(folderId);
      
      return res.status(200).json({
        success: true,
        stats
      });
    } catch (error) {
      console.error("Error al obtener estadísticas procesales:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener estadísticas procesales",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },
  
  /**
   * Obtiene las etapas disponibles para mostrar en la interfaz
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  getAvailableStages: async (req, res) => {
    try {
      // Obtener etapas definidas en el servicio
      const PROCESS_STAGES = [
        // Etapas prejudiciales
        { name: "Intimación", phase: "prejudicial", order: 1 },
        { name: "Negociación", phase: "prejudicial", order: 2 },
        { name: "Mediación", phase: "prejudicial", order: 3 },
        { name: "Acuerdo prejudicial", phase: "prejudicial", order: 4 },
        
        // Etapas judiciales
        { name: "Presentación de demanda", phase: "judicial", order: 5 },
        { name: "Traslado de demanda", phase: "judicial", order: 6 },
        { name: "Contestación de demanda", phase: "judicial", order: 7 },
        { name: "Audiencia preliminar", phase: "judicial", order: 8 },
        { name: "Apertura de prueba", phase: "judicial", order: 9 },
        { name: "Producción de prueba", phase: "judicial", order: 10 },
        { name: "Alegatos", phase: "judicial", order: 11 },
        { name: "Sentencia de primera instancia", phase: "judicial", order: 12 },
        { name: "Apelación", phase: "judicial", order: 13 },
        { name: "Sentencia de apelación", phase: "judicial", order: 14 },
        { name: "Ejecución", phase: "judicial", order: 15 },
        { name: "Archivo", phase: "judicial", order: 16 }
      ];
      
      // Organizar por fase para mejor presentación
      const stagesByPhase = {
        prejudicial: PROCESS_STAGES.filter(stage => stage.phase === "prejudicial")
          .sort((a, b) => a.order - b.order),
        judicial: PROCESS_STAGES.filter(stage => stage.phase === "judicial")
          .sort((a, b) => a.order - b.order)
      };
      
      return res.status(200).json({
        success: true,
        stages: PROCESS_STAGES,
        stagesByPhase
      });
    } catch (error) {
      console.error("Error al obtener etapas disponibles:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener etapas disponibles",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
};

module.exports = processController;