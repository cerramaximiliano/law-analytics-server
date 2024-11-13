const mongoose = require("mongoose");

const UserAlertStatusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alert",
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "blue", // Color inicial; puedes definir diferentes colores
    },
    viewedAt: {
      type: Date,
      required: false,
    },
    createdAt: {
      type: Date,
      required: false,
      defaul: Date.now(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserAlertStatus", UserAlertStatusSchema);
