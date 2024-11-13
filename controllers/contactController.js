// controllers/contactController.js
const Contact = require("../models/Contact");

// Crear un nuevo contacto
exports.createContact = async (req, res) => {
  try {
    const contactData = req.body;
    contactData.userId = req.user._id; // Suponiendo que `req.user` contiene el `userId` autenticado
    const newContact = await Contact.create(contactData);
    res
      .status(201)
      .json({ message: "Contacto creado exitosamente", contact: newContact });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear el contacto", error });
  }
};

// Obtener todos los contactos por userId
exports.getContactsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const contacts = await Contact.find({ userId });
    res.status(200).json(contacts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener los contactos por userId", error });
  }
};

// Obtener todos los contactos por groupId
exports.getContactsByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;
    const contacts = await Contact.find({ groupId });
    res.status(200).json(contacts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener los contactos por groupId", error });
  }
};

// Eliminar un contacto por _id
exports.deleteContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedContact = await Contact.findByIdAndDelete(id);
    if (!deletedContact) {
      return res.status(404).json({ message: "Contacto no encontrado" });
    }
    res.status(200).json({ message: "Contacto eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el contacto", error });
  }
};

exports.updateContact = async (req, res) => {
    try {
      const contactId = req.params.id; // El ID del contacto que se va a actualizar
      const updateData = req.body; // Los datos actualizados del cuerpo de la solicitud
  
      // Actualiza el contacto y devuelve el contacto actualizado
      const updatedContact = await Contact.findByIdAndUpdate(
        contactId,
        updateData,
        { new: true, runValidators: true }
      );
  
      if (!updatedContact) {
        return res.status(404).json({ message: "Contacto no encontrado" });
      }
  
      res.status(200).json({ message: "Contacto actualizado exitosamente", contact: updatedContact });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al actualizar el contacto", error });
    }
  };