const mongoose = require("mongoose");
const { Schema } = mongoose;

const PreFolderSchema = new Schema(
  {
    initialDatePreFolder: {
      type: String,
      required: false,
    },
    finalDatePreFolder: {
      type: String,
      required: false,
    },
    memberPreFolder: {
      type: String,
      required: false,
    },
    numberPreFolder: {
      type: String,
      required: false,
    },
    amountPreFolder: {
      type: Number,
      required: false,
    },
    statusPreFolder: {
      type: String,
      required: false,
    },
    descriptionPreFolder: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const JudFolderSchema = new Schema(
  {
    initialDateJudFolder: {
      type: String,
      required: false,
    },
    finalDateJudFolder: {
      type: String,
      required: false,
    },
    numberJudFolder: {
      type: String,
      required: false,
    },
    statusJudFolder: {
      type: String,
      required: false,
    },
    amountJudFolder: {
      type: String,
      required: false,
    },
    descriptionJudFolder: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const FolderSchema = new Schema(
  {
    folderId: {
      type: String,
      required: false,
    },
    folderName: {
      type: String,
      required: true,
    },
    materia: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Nueva", "En Proceso", "Cerrada", "Pendiente"],
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    initialDateFolder: {
      type: String,
      required: false,
    },
    finalDateFolder: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: false,
    },
    folderJuris: {
      item: {
        type: String,
        required: false,
        default: null,
      },
      label: {
        type: String,
        required: false,
        default: null,
      },
    },
    folderFuero: {
      type: String,
      required: false,
      default: null,
    },
    preFolder: {
      type: PreFolderSchema,
      required: false,
      default: null,
    },
    judFolder: {
      type: JudFolderSchema,
      required: false,
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: false,
    },
    situationFolder: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Folder", FolderSchema);
