const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  progress: { type: Number },
  done: { type: Number },
  checked: { type: Boolean, required: true },
  date: { type: String, required: true },
  folderId: { type: String },
  userId: { type: String, required: true },
  groupId: { type: String },
  description: { type: String },
});

const Task = mongoose.model("TaskApp", taskSchema);

module.exports = Task;
