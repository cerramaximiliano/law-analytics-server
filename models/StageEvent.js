const mongoose = require("mongoose");
const { Schema } = mongoose;

const StageEventSchema = new Schema(
    {
        // Referencia al expediente
        folderId: {
            type: Schema.Types.ObjectId,
            ref: "Folder",
            required: true,
            index: true
        },

        // Nombre de la etapa
        stageName: {
            type: String,
            required: true
        },

        // Fase a la que pertenece la etapa
        phase: {
            type: String,
            enum: ["prejudicial", "judicial"],
            required: true
        },

        // Tipo de evento
        eventType: {
            type: String,
            enum: ["start", "end"],
            required: true
        },

        // Orden natural de la etapa en el proceso
        stageOrder: {
            type: Number,
            required: true
        },

        // Usuario que registró el evento
        registeredBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Notas adicionales
        notes: String,

        // Duración calculada (solo para eventos "end")
        duration: Number
    },
    {
        timestamps: true
    }
);

// Índices para optimizar consultas
StageEventSchema.index({ folderId: 1, createdAt: -1 });
StageEventSchema.index({ folderId: 1, stageName: 1, eventType: 1 });


module.exports = {
    StageEvent: mongoose.model("StageEvent", StageEventSchema)
};