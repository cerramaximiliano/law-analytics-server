// src/models/SupportContact.js o models/SupportContact.js
const mongoose = require('mongoose');

const supportContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingresa un email válido']
    },
    subject: {
      type: String,
      required: [true, 'El asunto es requerido'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    message: {
      type: String,
      required: [true, 'El mensaje es requerido'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved', 'closed'],
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true // Esto añade createdAt y updatedAt automáticamente
  }
);

// Índices para búsquedas frecuentes
supportContactSchema.index({ status: 1 });
supportContactSchema.index({ priority: 1 });
supportContactSchema.index({ createdAt: -1 });

const SupportContact = mongoose.model('SupportContact', supportContactSchema);

module.exports = SupportContact;