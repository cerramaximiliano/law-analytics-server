const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      required: true,
    },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    time: { type: String, required: true },
    dateExpiration: { type: String },
    title: { type: String, required: true },
    code: { type: String },
    idCode: { type: String },
    user: { type: String, required: true },
    notification: { type: String, required: true },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
