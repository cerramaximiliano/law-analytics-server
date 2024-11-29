const { mongoose } = require("mongoose");
const Movement = require("../models/Movements");

exports.createMovement = async (req, res) => {
  try {
    const movementData = req.body;
    console.log(movementData);
    // Validar datos requeridos
    if (
      !movementData.userId ||
      !movementData.folderId ||
      !movementData.movement ||
      !movementData.title
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos requeridos",
      });
    }

    // Si no se proporciona time, usar la fecha actual
    if (!movementData.time) {
      movementData.time = new Date().toISOString();
    }

    const newMovement = new Movement(movementData);
    const savedMovement = await newMovement.save();

    res.status(201).json({
      success: true,
      message: "Movimiento creado exitosamente",
      movement: savedMovement,
    });
  } catch (error) {
    console.error("Error creating movement:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear el movimiento",
      error: error.message,
    });
  }
};

// Obtener movimientos por userId
exports.getMovementsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const movements = await Movement.find({ userId }).sort({ time: -1 }); // Ordenar por fecha descendente

    res.status(200).json(movements);
  } catch (error) {
    console.error("Error getting movements:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los movimientos",
      error: error.message,
    });
  }
};

// Actualizar movimiento
exports.updateMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedMovement = await Movement.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedMovement) {
      return res.status(404).json({
        success: false,
        message: "Movimiento no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Movimiento actualizado exitosamente",
      movement: updatedMovement,
    });
  } catch (error) {
    console.error("Error updating movement:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el movimiento",
      error: error.message,
    });
  }
};

// Eliminar movimiento
exports.deleteMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMovement = await Movement.findByIdAndDelete(id);

    if (!deletedMovement) {
      return res.status(404).json({
        success: false,
        message: "Movimiento no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Movimiento eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error deleting movement:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el movimiento",
      error: error.message,
    });
  }
};

exports.getMovementsByFolderId = async (req, res) => {
  try {
    const { folderId } = req.params;

    // Validar folderId
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({
        success: false,
        message: "ID de folder inválido",
      });
    }

    // Buscar movements por folderId
    const movements = await Movement.find({
      folderId,
    }).sort({
      time: -1, // Ordenar por fecha descendente
    });

    res.status(200).json({
      success: true,
      movements,
      count: movements.length,
    });
  } catch (error) {
    console.error("Error getting movements by folder:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los movimientos del folder",
      error: error.message,
    });
  }
};
