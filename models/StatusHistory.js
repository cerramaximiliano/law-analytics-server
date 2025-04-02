const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Esquema para registrar el historial de cambios de estado de las carpetas
 * Permite hacer seguimiento detallado de la duración de cada estado y quién realizó los cambios
 */
const StatusHistorySchema = new Schema(
  {
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      required: true,
      index: true // Para optimizar búsquedas por carpeta
    },
    previousStatus: {
      type: String,
      enum: ["Nueva", "En Proceso", "Cerrada", "Pendiente"],
      required: false
    },
    newStatus: {
      type: String,
      enum: ["Nueva", "En Proceso", "Cerrada", "Pendiente"],
      required: true
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    notes: {
      type: String,
      required: false
    },
    duration: {
      type: Number, // Duración en milisegundos del estado anterior
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar consultas comunes
StatusHistorySchema.index({ createdAt: -1 });
StatusHistorySchema.index({ folderId: 1, createdAt: -1 });

module.exports = mongoose.model("StatusHistory", StatusHistorySchema);