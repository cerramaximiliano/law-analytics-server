const Notification = require("../models/Notification");

const createNotification = async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getNotificationsByUserId = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.params.userId,
    });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getNotificationsByFolderId = async (req, res) => {
  try {
    const notifications = await Notification.find({
      folderId: req.params.folderId,
    });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getNotificationsByGroupId = async (req, res) => {
  try {
    const notifications = await Notification.find({
      groupId: req.params.groupId,
    });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!notification) throw new Error("Notification not found");
    res.json({ success: true, notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) throw new Error("Notification not found");
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createNotification,
  getNotificationsByUserId,
  getNotificationsByGroupId,
  getNotificationsByFolderId,
  updateNotification,
  deleteNotification,
};
