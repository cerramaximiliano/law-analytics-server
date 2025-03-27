const Task = require("../models/Task");
const logger = require("../utils/logger");


const createTask = async (req, res) => {
  try {
    logger.info("Datos recibidos para crear tarea:", req.body);

    // Validar fecha de vencimiento
    if (req.body.date && !req.body.dueDate) {
      // Si el cliente envía date pero no dueDate, convertir date a dueDate
      req.body.dueDate = new Date(req.body.date);
    }

    const task = new Task(req.body);
    await task.save();
    logger.info("Tarea creada:", task);
    res.status(201).json(task);
  } catch (error) {
    logger.error("Error al crear tarea:", error);
    res.status(400).json({ error: error.message });
  }
};

// Find by userId
const findTasksByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Permitir filtrado por estado, prioridad o fecha
    const { status, priority, dueDate, checked } = req.query;
    const filter = { userId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (checked !== undefined) filter.checked = checked === 'true';

    // Filtrar por fecha de vencimiento
    if (dueDate) {
      const date = new Date(dueDate);
      // Buscar tareas con fecha igual o posterior
      filter.dueDate = { $gte: date };
    }

    const tasks = await Task.find(filter);
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Find by groupId
const findTasksByGroupId = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Permitir filtrado por estado, prioridad o fecha
    const { status, priority, dueDate, checked } = req.query;
    const filter = { groupId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (checked !== undefined) filter.checked = checked === 'true';

    // Filtrar por fecha de vencimiento
    if (dueDate) {
      const date = new Date(dueDate);
      filter.dueDate = { $gte: date };
    }

    const tasks = await Task.find(filter);
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Find by folderId
const findTasksByFolderId = async (req, res) => {
  try {
    const folderId = req.params.folderId;

    // Permitir filtrado por estado, prioridad o fecha
    const { status, priority, dueDate, checked } = req.query;
    const filter = { folderId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (checked !== undefined) filter.checked = checked === 'true';

    // Filtrar por fecha de vencimiento
    if (dueDate) {
      const date = new Date(dueDate);
      filter.dueDate = { $gte: date };
    }

    const tasks = await Task.find(filter);
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update by id
const updateTask = async (req, res) => {
  try {
    const id = req.params._id;
    const updates = req.body;

    // Convertir date a dueDate si es necesario
    if (updates.date && !updates.dueDate) {
      updates.dueDate = new Date(updates.date);
    }

    // Utilizar runValidators para asegurar que los datos cumplen con el esquema
    const task = await Task.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!task) return res.status(404).json({ error: "Tarea no encontrada" });
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete by id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params._id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const toggleTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Cambiar el estado checked
    task.checked = !task.checked;

    // Middleware en el modelo se encargará de sincronizar status y checked
    await task.save();

    res.json(task);
  } catch (error) {
    console.error("Error en toggleTaskStatus:", error);
    res.status(500).json({ message: 'Error al actualizar el estado de la tarea' });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!text || !author) {
      return res.status(400).json({ message: 'El texto y el autor son requeridos' });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    const comment = {
      text,
      author,
      date: new Date()
    };

    task.comments.push(comment);
    await task.save();

    res.json(task);
  } catch (error) {
    console.error("Error al añadir comentario:", error);
    res.status(500).json({ message: 'Error al añadir comentario' });
  }
};

const manageSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { subtaskId, name, completed } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Si se proporciona subtaskId, actualizar la subtarea existente
    if (subtaskId) {
      const subtaskIndex = task.subtasks.findIndex(st => st._id.toString() === subtaskId);

      if (subtaskIndex === -1) {
        return res.status(404).json({ message: 'Subtarea no encontrada' });
      }

      if (name) task.subtasks[subtaskIndex].name = name;
      if (completed !== undefined) task.subtasks[subtaskIndex].completed = completed;
    }
    // Si no hay subtaskId, crear una nueva subtarea
    else {
      if (!name) {
        return res.status(400).json({ message: 'El nombre de la subtarea es requerido' });
      }

      task.subtasks.push({
        name,
        completed: completed || false
      });
    }

    await task.save();
    res.json(task);
  } catch (error) {
    console.error("Error al gestionar subtarea:", error);
    res.status(500).json({ message: 'Error al gestionar subtarea' });
  }
};

const getUpcomingTasks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query; // Por defecto, próximos 7 días

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + parseInt(days));

    const tasks = await Task.find({
      userId,
      checked: false, // Solo tareas no completadas
      dueDate: {
        $gte: today,
        $lte: endDate
      }
    }).sort({ dueDate: 1 }); // Ordenar por fecha más cercana primero

    res.json(tasks);
  } catch (error) {
    console.error("Error al obtener tareas próximas:", error);
    res.status(500).json({ message: 'Error al obtener tareas próximas' });
  }
};

const assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Se requiere un array de userIds' });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Actualizar asignaciones existentes
    task.assignedTo = [...new Set([...task.assignedTo, ...userIds])]; // Eliminar duplicados
    await task.save();

    res.json(task);
  } catch (error) {
    console.error("Error al asignar tarea:", error);
    res.status(500).json({ message: 'Error al asignar tarea' });
  }
};



module.exports = {
  createTask,
  findTasksByUserId,
  findTasksByGroupId,
  findTasksByFolderId,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  addComment,
  manageSubtask,
  getUpcomingTasks,
  assignTask
};
