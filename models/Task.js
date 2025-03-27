const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  progress: { type: Number },
  done: { type: Number },
  checked: { type: Boolean, required: true, default: false },
  // Eliminado 'date' para evitar redundancia con dueDate
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['baja', 'media', 'alta'], default: 'media' },
  status: { 
    type: String, 
    enum: ['pendiente', 'en_progreso', 'revision', 'completada', 'cancelada'], 
    default: 'pendiente' 
  },
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  comments: [{
    text: { type: String },
    author: { type: String },
    date: { type: Date, default: Date.now }
  }],
  folderId: { type: String },
  userId: { type: String, required: true },
  groupId: { type: String },
  description: { type: String },
  assignedTo: [{ type: String }], // Default se manejará en middleware
  reminders: [{
    date: { type: Date },
    sent: { type: Boolean, default: false }
  }],
  subtasks: [{
    name: { type: String },
    completed: { type: Boolean, default: false }
  }]
},
{ timestamps: true }
);

// Middleware para document.save()
taskSchema.pre('save', function(next) {
  // Si es un documento nuevo y no tiene elementos asignados
  if (this.isNew && (!this.assignedTo || this.assignedTo.length === 0)) {
    // Asignar el userId como primer elemento del array assignedTo
    this.assignedTo = [this.userId];
  }
  
  // Sincronizar status y checked
  if (this.status === 'completada' || this.status === 'cancelada') {
    this.checked = true;
  } else if (this.isModified('status')) {
    this.checked = false;
  }
  
  // Si checked cambia a true y status no está en un estado final
  if (this.isModified('checked') && this.checked === true && 
      this.status !== 'completada' && this.status !== 'cancelada') {
    this.status = 'completada';
  }
  
  next();
});

// Middleware para findOneAndUpdate
taskSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Si se está actualizando status a un estado final
  if (update.status === 'completada' || update.status === 'cancelada') {
    this.updateOne({ $set: { checked: true } });
  } 
  // Si se está actualizando status a un estado no final
  else if (update.status && update.status !== 'completada' && update.status !== 'cancelada') {
    this.updateOne({ $set: { checked: false } });
  }
  
  // Si se está actualizando checked a true
  if (update.checked === true) {
    // Y no se está actualizando explícitamente status
    if (!update.status) {
      this.updateOne({ $set: { status: 'completada' } });
    }
  }
  
  next();
});

// Middleware para updateOne
taskSchema.pre('updateOne', function(next) {
  const update = this.getUpdate();
  
  if (update.$set) {
    if (update.$set.status === 'completada' || update.$set.status === 'cancelada') {
      update.$set.checked = true;
    } else if (update.$set.status) {
      update.$set.checked = false;
    }
    
    if (update.$set.checked === true && !update.$set.status) {
      update.$set.status = 'completada';
    }
  }
  
  next();
});

// Middleware para updateMany
taskSchema.pre('updateMany', function(next) {
  const update = this.getUpdate(); // Corregido: Obtener el objeto update
  
  if (update.$set) {
    if (update.$set.status === 'completada' || update.$set.status === 'cancelada') {
      update.$set.checked = true;
    } else if (update.$set.status) {
      update.$set.checked = false;
    }
    
    if (update.$set.checked === true && !update.$set.status) {
      update.$set.status = 'completada';
    }
  }
  
  next();
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;