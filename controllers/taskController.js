const Task = require("../models/Task");

const createTask = async (req, res) => {
  try {
    console.log(req.body);
    const task = new Task(req.body);
    await task.save();
    console.log(task);
    res.status(201).json(task);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
};

// Find by userId
const findTasksByUserId = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId });
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Find by groupId
const findTasksByGroupId = async (req, res) => {
  try {
    const tasks = await Task.find({ groupId: req.params.groupId });
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Find by folderId
const findTasksByFolderId = async (req, res) => {
  try {
    const tasks = await Task.find({ folderId: req.params.folderId });
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update by id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params._id, req.body, {
      new: true,
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
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

      task.checked = !task.checked; // Toggle el valor actual
      await task.save();

      res.json(task);
  } catch (error) {
      res.status(500).json({ message: 'Error al actualizar el estado de la tarea' });
  }
};
module.exports = {
  createTask,
  findTasksByUserId,
  findTasksByGroupId,
  findTasksByFolderId,
  updateTask,
  deleteTask,
  toggleTaskStatus
};
