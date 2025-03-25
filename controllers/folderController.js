// controllers/folderController.js
const { default: mongoose } = require("mongoose");
const Folder = require("../models/Folder.js");
const statsService = require('../services/statsService');

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
    console.log(folder);
    res.status(200).json({ success: true, folder });
  } catch (error) {
    console.error("Error al obtener folders por groupId:", error);
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
    console.log(id, updatedData);
    const updatedFolder = await Folder.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    if (!updatedFolder) {
      return res
        .status(404)
        .json({ success: false, message: "Folder no encontrado" });
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
