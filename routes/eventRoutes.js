// event.routes.js
const express = require("express");
const {
  createEvent,
  getEventsByUserId,
  getEventsByGroupId,
  deleteEventById,
  updateEventById,
  getEventsById,
} = require("../controllers/eventController");

const router = express.Router();

// Ruta para crear un evento
router.post("/", createEvent);

// Ruta para obtener eventos por userId
router.get("/user/:userId", getEventsByUserId);

// Ruta para obtener eventos por groupId
router.get("/group/:groupId", getEventsByGroupId);

router.get("/id/:_id", getEventsById);

// Ruta para eliminar un evento por id
router.delete("/:id", deleteEventById);

// Ruta para actualizar un evento por id
router.put("/:id", updateEventById);

module.exports = router;
