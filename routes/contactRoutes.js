// routes/contactRoutes.js
const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const authMiddleware = require("../middlewares/authMiddleware"); // Middleware de autenticación

// Ruta para crear un nuevo contacto
router.post("/create", authMiddleware, contactController.createContact);

// Ruta para obtener todos los contactos de un usuario específico por userId
router.get(
  "/user/:userId",
  authMiddleware,
  contactController.getContactsByUserId
);

// Ruta para obtener todos los contactos de un grupo específico por groupId
router.get(
  "/group/:groupId",
  authMiddleware,
  contactController.getContactsByGroupId
);

// Ruta para eliminar un contacto por _id
router.delete("/:id", authMiddleware, contactController.deleteContactById);

router.put("/:id", authMiddleware, contactController.updateContact);

module.exports = router;