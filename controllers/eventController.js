// event.controller.js
const Event = require("../models/Event");

// Crear evento
const createEvent = async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json({ success: true, event });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Error al crear el evento", error });
  }
};

// Buscar eventos por userId
const getEventsByUserId = async (req, res) => {
  try {
    const events = await Event.find({ userId: req.params.userId });
    res.status(200).json({ success: true, events });
  } catch (error) {
    res
      .status(404)
      .json({ success: false, message: "Eventos no encontrados", error });
  }
};

// Buscar eventos por groupId
const getEventsByGroupId = async (req, res) => {
  try {
    const events = await Event.find({ groupId: req.params.groupId });
    res.status(200).json({ success: true, events });
  } catch (error) {
    res
      .status(404)
      .json({ success: false, message: "Eventos no encontrados", error });
  }
};

// Buscar eventos por Id
const getEventsById = async (req, res) => {
  try {
    const events = await Event.find({ folderId: req.params._id });
    res.status(200).json({ success: true, events });
  } catch (error) {
    res
      .status(404)
      .json({ success: false, message: "Eventos no encontrados", error });
  }
};

// Eliminar evento por id
const deleteEventById = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }
    res
      .status(200)
      .json({ success: true, message: "Evento eliminado correctamente" });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Error al eliminar el evento", error });
  }
};

// Actualizar evento por id
const updateEventById = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }
    res.status(200).json({ success: true, event });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al actualizar el evento",
      error,
    });
  }
};

module.exports = {
  createEvent,
  getEventsByUserId,
  getEventsByGroupId,
  deleteEventById,
  updateEventById,
  getEventsById,
};
