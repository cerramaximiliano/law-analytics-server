const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  progress: Number,
  done: Number,
  checked: { type: Boolean, required: true },
  date: { type: String, required: true },
  folderId: String,
  userId: { type: String, required: true },
  groupId: String,
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
