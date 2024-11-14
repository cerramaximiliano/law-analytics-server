// routes/folderRoutes.js

const express = require("express");
const router = express.Router();

const {
  createFolder,
  getFoldersByGroupId,
  deleteFolderById,
  updateFolderById,
  getFoldersByUserId,
} = require("../controllers/folderController.js");

// Ruta para buscar todos los folders por userId
router.get("/user/:userId", getFoldersByUserId);

// Ruta para crear un nuevo folder
router.post("/", createFolder);

// Ruta para buscar todos los folders por groupId
router.get("/group/:groupId", getFoldersByGroupId);

// Ruta para eliminar un folder por _id
router.delete("/:id", deleteFolderById);

// Ruta para actualizar un folder por _id
router.put("/:id", updateFolderById);

module.exports = router;
