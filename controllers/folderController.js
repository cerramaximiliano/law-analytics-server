// controllers/folderController.js
const { default: mongoose } = require("mongoose");
const Folder = require("../models/Folder.js");
const statsService = require('../services/statsService');
const StatusHistory = require("../models/StatusHistory.js");


// Buscar todos los folders por userId
exports.getFoldersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const folders = await Folder.find({ userId });
    res.status(200).json({ success: true, folders });
  } catch (error) {
    console.error("Error al obtener folders por userId:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener folders por userId",
      error,
    });
  }
};

// Buscar todos los folders por groupId
exports.getFoldersById = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Expediente no encontrado"
      });
    }

    let processInfo = null;
    if (folder.currentPhase || folder.currentStage) {
      try {
        // Versión ligera de las estadísticas (solo lo esencial)
        const currentStageEvents = await StageEvent.find({
          folderId: folder._id,
          stageName: folder.currentStage
        }).sort({ createdAt: -1 }).limit(1);

        processInfo = {
          currentPhase: folder.currentPhase,
          currentStage: folder.currentStage,
          currentStageStartDate: currentStageEvents[0]?.createdAt || null
        };
      } catch (err) {
        console.error("Error al cargar información del proceso:", err);
      }
    }

    res.status(200).json({ success: true, folder, processInfo });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Error al obtener folders por groupId",
      error,
    });
  }
};

// Crear un nuevo folder
exports.createFolder = async (req, res) => {
  try {
    const folderData = req.body;
    const newFolder = await Folder.create(folderData);

    if (folderData.userId) {
      await statsService.updateEntityCount(folderData.userId, 'folders', 1);
    }

    // Registrar el estado inicial en el historial
    if (newFolder._id && newFolder.status && folderData.userId) {
      await StatusHistory.create({
        folderId: newFolder._id,
        previousStatus: null,
        newStatus: newFolder.status,
        changedBy: folderData.userId,
        notes: "Creación inicial de la carpeta"
      });
    }

    res.status(201).json({ success: true, folder: newFolder });
  } catch (error) {
    console.error("Error al crear el folder:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al crear el folder", error });
  }
};

// Buscar todos los folders por groupId
exports.getFoldersByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;
    const folders = await Folder.find({ groupId });

    if (!folders) {
      return res.status(404).json({
        success: false,
        message: "Expediente no encontrado"
      });
    }


    res.status(200).json({ success: true, folders });
  } catch (error) {
    console.error("Error al obtener folders por groupId:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener folders por groupId",
      error,
    });
  }
};

exports.getFoldersByIds = async (req, res) => {
  try {
    const { folderIds } = req.body;

    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de folderIds",
      });
    }

    // Validar que todos los IDs sean válidos
    const validIds = folderIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionaron IDs válidos",
      });
    }

    // Buscar todos los folders que coincidan con los IDs
    const folders = await Folder.find({
      _id: { $in: validIds },
    }).select("folderName description status"); // Seleccionar solo los campos necesarios

    res.status(200).json({
      success: true,
      folders,
    });
  } catch (error) {
    console.error("Error en getFoldersByIds:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los folders",
      error: error.message,
    });
  }
};

// Eliminar un folder por _id
exports.deleteFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const folderToDelete = await Folder.findById(id);

    if (!folderToDelete) {
      return res.status(404).json({
        success: false,
        message: "Folder no encontrado"
      });
    }

    // Guardar el userId antes de eliminar
    const userId = folderToDelete.userId;

    const deletedFolder = await Folder.findByIdAndDelete(id);

    // Decrementar el contador de folders
    if (userId) {
      await statsService.updateEntityCount(userId, 'folders', -1);
    }

    // Opcionalmente, podrías mantener el historial o eliminarlo
    await StatusHistory.deleteMany({ folderId: id });

    res.status(200).json({
      success: true,
      folder: deletedFolder,
    });
  } catch (error) {
    console.error("Error al eliminar el folder:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el folder",
      error
    });
  }
};


// Actualizar un folder por _id
exports.updateFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // Verificar que el expediente existe
    const currentFolder = await Folder.findById(id);
    if (!currentFolder) {
      return res.status(404).json({
        success: false,
        message: "Folder no encontrado"
      });
    }

    // Creamos una copia del objeto actualizado para modificarlo
    let folderToUpdate = { ...updatedData };
    let updatedFolder = currentFolder;

    // Si hay un cambio en el estado general del expediente
    if (folderToUpdate.status && folderToUpdate.status !== currentFolder.status) {
      const userId = req.user?._id || currentFolder.userId;

      try {
        // Mantener el uso de folderService.updateFolderStatus para el historial
        updatedFolder = await folderService.updateFolderStatus(
          id,
          folderToUpdate.status,
          userId,
          folderToUpdate.notes || ""
        );

        // Eliminar los campos ya manejados
        delete folderToUpdate.status;
        delete folderToUpdate.notes;
      } catch (err) {
        console.error("Error al actualizar estado con historial:", err);
        // Seguimos con la actualización normal si falla el servicio de historial
      }
    }

    // Manejo para cambios en etapas procesales (nuevo sistema)
    if (folderToUpdate.currentStage && folderToUpdate.currentStage !== currentFolder.currentStage) {
      const userId = req.user?._id || currentFolder.userId;

      try {
        // Usar el nuevo servicio para iniciar la etapa solicitada
        await processService.startStage(
          id,
          folderToUpdate.currentStage,
          userId,
          folderToUpdate.notes || "Actualización desde edición de expediente"
        );

        // Si tuvimos éxito, obtener la versión actualizada del expediente
        updatedFolder = await Folder.findById(id);

        // Eliminar los campos ya manejados
        delete folderToUpdate.currentStage;
        delete folderToUpdate.currentPhase; // Si existiera
        if (!folderToUpdate.status) { // Solo eliminar notes si no se usó para status
          delete folderToUpdate.notes;
        }
      } catch (err) {
        console.error("Error al actualizar etapa procesal:", err);
      }
    }

    // Si quedan campos por actualizar después del manejo especial
    if (Object.keys(folderToUpdate).length > 0) {
      // Actualizar campos restantes
      updatedFolder = await Folder.findByIdAndUpdate(
        id,
        folderToUpdate,
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Folder actualizado exitosamente",
      folder: updatedFolder,
    });
  } catch (error) {
    console.error("Error al actualizar el folder:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el folder",
      error,
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user?._id; // Asumiendo que el usuario está autenticado

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: "Se requiere ID de carpeta y nuevo estado"
      });
    }

    // Validar que el estado sea uno de los permitidos
    const validStatus = ["Nueva", "En Proceso", "Cerrada", "Pendiente"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser uno de: ${validStatus.join(', ')}`
      });
    }

    const updatedFolder = await folderService.updateFolderStatus(
      id,
      status,
      userId,
      notes
    );

    return res.status(200).json({
      success: true,
      message: "Estado actualizado correctamente",
      folder: updatedFolder
    });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el estado de la carpeta",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};


exports.getStatusHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Se requiere ID de carpeta"
      });
    }

    const history = await folderService.getFolderStatusHistory(id);

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error("Error al obtener historial:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener el historial de estados",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};




exports.getStatusStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Se requiere ID de carpeta"
      });
    }

    const stats = await folderService.getFolderStatusStats(id);

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de estados",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};



exports.getGlobalStatusStats = async (req, res) => {
  try {
    const stats = await folderService.getAverageStatusDuration();

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error al obtener estadísticas globales:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas globales de estados",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};