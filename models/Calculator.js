// models/calculator.model.js
const mongoose = require("mongoose");

const calculatorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    folderName: { type: String },
    type: {
      type: String,
      required: true,
      enum: ["Calculado", "Ofertado", "Reclamado"],
    },
    classType: { type: String, enum: ["laboral", "civil", "intereses"] },
    subClassType: { type: String },
    amount: { type: Number, required: true },
    user: { type: String },
    interest: { type: Number },
    variables: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Calculator", calculatorSchema);
