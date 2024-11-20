// controllers/folderController.js

const Folder = require("../models/Folder.js");

// Buscar todos los folders por userId
exports.getFoldersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const folders = await Folder.find({ userId });
    res.status(200).json({ success: true, folders });
  } catch (error) {
    console.error("Error al obtener folders por userId:", error);
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
    console.log(folderData);
    const newFolder = await Folder.create(folderData);

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
    res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener folders por groupId",
        error,
      });
  }
};

// Eliminar un folder por _id
exports.deleteFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFolder = await Folder.findByIdAndDelete(id);
    if (!deletedFolder) {
      return res
        .status(404)
        .json({ success: false, message: "Folder no encontrado" });
    }
    res.status(200).json({
      success: true,
      folder: deletedFolder,
    });
  } catch (error) {
    console.error("Error al eliminar el folder:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al eliminar el folder", error });
  }
};

// Actualizar un folder por _id
exports.updateFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
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
    res
      .status(500)
      .json({
        success: false,
        message: "Error al actualizar el folder",
        error,
      });
  }
};
