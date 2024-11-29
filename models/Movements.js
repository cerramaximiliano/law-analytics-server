const mongoose = require('mongoose');

const MovementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Para mejorar el rendimiento de las búsquedas
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserGroup',
      required: false,
      index: true
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      required: true,
      index: true
    },
    time: {
      type: String,
      required: true
    },
    dateExpiration: {
      type: String,
      required: false
    },
    movement: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true // Elimina espacios en blanco al inicio y final
    },
    description: {
      type: String,
      required: false,
      trim: true
    },
    link: {
      type: String,
      required: false,
      trim: true,
    }
  },
  { 
    timestamps: true, // Agrega createdAt y updatedAt
    versionKey: false // Elimina el campo __v
  }
);


const Movement = mongoose.model('Movement', MovementSchema);

module.exports = Movement;