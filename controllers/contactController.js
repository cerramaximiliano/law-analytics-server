// controllers/contactController.js
const { default: mongoose } = require("mongoose");
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

    res.status(200).json({
      message: "Contacto actualizado exitosamente",
      contact: updatedContact,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar el contacto", error });
  }
};

exports.updateMultipleContacts = async (req, res) => {
  try {
    const contactsToUpdate = req.body.contacts;
    console.log('Recibiendo request para actualizar contactos:', JSON.stringify(contactsToUpdate, null, 2));

    if (!Array.isArray(contactsToUpdate) || contactsToUpdate.length === 0) {
      return res.status(400).json({
        message: "No se enviaron contactos para actualizar"
      });
    }

    const updatedContacts = [];
    const errors = [];

    for (const contactData of contactsToUpdate) {
      try {
        // Extraer folderIds del updateData
        let folderIdsToUpdate = [];
        
        // Si hay folderIds en updateData, usarlos
        if (contactData.updateData.folderIds) {
          folderIdsToUpdate = contactData.updateData.folderIds;
        } 
        // Si no hay folderIds pero hay folderId, usar ese
        else if (contactData.updateData.folderId) {
          folderIdsToUpdate = [contactData.updateData.folderId];
        }

        // Crear objeto de actualización
        const updateObj = {
          ...contactData.updateData,
          folderIds: folderIdsToUpdate
        };

        // Eliminar campos que no queremos actualizar
        delete updateObj._id;
        delete updateObj.__v;
        delete updateObj.createdAt;
        delete updateObj.updatedAt;
        delete updateObj.folderId;

        console.log(`Actualizando contacto ${contactData.id} con folderIds:`, folderIdsToUpdate);

        // Realizar la actualización
        const updatedContact = await Contact.findByIdAndUpdate(
          contactData.id,
          updateObj,
          { new: true }
        );

        if (!updatedContact) {
          throw new Error(`No se encontró el contacto con ID: ${contactData.id}`);
        }

        console.log('Contacto actualizado:', updatedContact);
        updatedContacts.push(updatedContact);

      } catch (error) {
        console.error(`Error actualizando contacto ${contactData.id}:`, error);
        errors.push({
          contactId: contactData.id,
          error: error.message
        });
      }
    }

    // Responder con el resultado
    return res.status(200).json({
      message: errors.length > 0 ? "Algunos contactos no pudieron actualizarse" : "Contactos actualizados exitosamente",
      errors: errors.length > 0 ? errors : undefined,
      contacts: updatedContacts
    });

  } catch (error) {
    console.error("Error general en updateMultipleContacts:", error);
    return res.status(500).json({
      message: "Error al actualizar los contactos",
      error: error.message
    });
  }
};

exports.unlinkFolderFromContact = async (req, res) => {
  try {
    const { contactId, folderId } = req.params;

    // Validar los IDs
    if (!mongoose.Types.ObjectId.isValid(contactId) || !mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({
        success: false,
        message: "IDs inválidos proporcionados"
      });
    }

    // Buscar el contacto y actualizar sus folderIds
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { $pull: { folderIds: folderId } },
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return res.status(404).json({
        success: false,
        message: "Contacto no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      message: "Folder desvinculado exitosamente",
      contact: updatedContact
    });

  } catch (error) {
    console.error("Error al desvincular folder:", error);
    res.status(500).json({
      success: false,
      message: "Error al desvincular el folder del contacto",
      error: error.message
    });
  }
};