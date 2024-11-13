const Alert = require("../models/Alert");
const UserAlertStatus = require("../models/UserAlertStatus");
const moment = require("moment");

// Controlador para obtener todas las alertas
exports.getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find();
    res.status(200).json(alerts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener las alertas", error: error.message });
  }
};

// Controlador para crear una nueva alerta
exports.createAlert = async (req, res) => {
  const {
    avatarType,
    avatarIcon,
    avatarSize,
    avatarInitial,
    primaryText,
    primaryVariant,
    secondaryText,
    actionText,
  } = req.body;

  try {
    const newAlert = new Alert({
      avatarType,
      avatarIcon,
      avatarSize,
      avatarInitial,
      primaryText,
      primaryVariant,
      secondaryText,
      actionText,
    });

    const savedAlert = await newAlert.save();
    res.status(201).json(savedAlert);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al crear la alerta", error: error.message });
  }
};

// Marcar alerta como vista
exports.markAlertAsRead = async (req, res) => {
  const { userId, alertId } = req.body;

  try {
    const userAlertStatus = await UserAlertStatus.findOneAndUpdate(
      { userId, alertId },
      { isRead: true, color: "grey", viewedAt: new Date() },
      { new: true, upsert: true }
    );
    res.status(200).json(userAlertStatus);
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar la alerta como leída",
      error: error.message,
    });
  }
};

exports.deleteAlerts = async (req, res) => {
  const { userId, alertId } = req.query;
  try {
    const result = await UserAlertStatus.deleteOne({ userId, alertId });
    if (result.deletedCount === 1) {
      console.log("Documento eliminado exitosamente.");
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Documento eliminado exitosamente",
      });
    } else {
      console.log(
        "No se encontró ningún documento con los criterios especificados."
      );
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Documento no encontrado",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar las alertas del usuario",
      error: error.message,
    });
  }
};

exports.getUserAlerts = async (req, res) => {
  const { userId } = req.params;
  try {
    const userAlertStatuses = await UserAlertStatus.find({ userId });
    const ids = userAlertStatuses.map((alerts) => alerts.alertId);
    //console.log(userAlertStatuses);
    const alerts = await Alert.find({ _id: { $in: ids } });

    const alertsWithCreatedAt = alerts.map((alert) => {
      const matchingStatus = userAlertStatuses.find(
        (status) => status.alertId.toString() === alert._id.toString()
      );
      const formattedDate = matchingStatus
        ? moment(matchingStatus.createdAt).format("DD/MM/YYYY")
        : null;

      return {
        ...alert.toObject(),
        secondaryText: matchingStatus ? formattedDate : null,
      };
    });

    res.status(200).json(alertsWithCreatedAt);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error al obtener las alertas del usuario",
      error: error.message,
    });
  }
};
