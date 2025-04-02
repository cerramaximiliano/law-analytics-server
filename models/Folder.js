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

const ProcessStageSchema = new Schema(
  {
    // Nombre de la etapa (por ejemplo: "Intimación", "Presentación de demanda", etc.)
    name: {
      type: String,
      required: true
    },
    // Fase a la que pertenece esta etapa
    phase: {
      type: String,
      enum: ["prejudicial", "judicial"],
      required: true
    },
    // Fechas de la etapa
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    // Si la etapa está activa actualmente
    isActive: {
      type: Boolean,
      default: false
    },
    // Quién está a cargo de esta etapa
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    // Notas específicas de esta etapa
    notes: {
      type: String,
      default: ""
    },
    // Documentos asociados a esta etapa (IDs de documentos)
    documents: [{
      type: Schema.Types.ObjectId,
      ref: "Document"
    }],
    // Indicador de orden para mostrar las etapas en secuencia
    order: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
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
    currentPhase: {
      type: String,
      enum: ["prejudicial", "judicial", null],
      default: null
    },
    // Etapa procesal actual dentro de la fase
    currentStage: {
      type: String,
      default: null
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
