const Folder = require("../models/Folder");
const StageEvent = require("../models/StageEvent");
const mongoose = require("mongoose");



// Definición de las etapas del proceso
const PROCESS_STAGES = [
    // Etapas prejudiciales
    { name: "Intimación", phase: "prejudicial", order: 1 },
    { name: "Negociación", phase: "prejudicial", order: 2 },
    { name: "Mediación", phase: "prejudicial", order: 3 },
    { name: "Acuerdo prejudicial", phase: "prejudicial", order: 4 },

    // Etapas judiciales
    { name: "Presentación de demanda", phase: "judicial", order: 5 },
    { name: "Traslado de demanda", phase: "judicial", order: 6 },
    { name: "Contestación de demanda", phase: "judicial", order: 7 },
    { name: "Audiencia preliminar", phase: "judicial", order: 8 },
    { name: "Apertura de prueba", phase: "judicial", order: 9 },
    { name: "Producción de prueba", phase: "judicial", order: 10 },
    { name: "Alegatos", phase: "judicial", order: 11 },
    { name: "Sentencia de primera instancia", phase: "judicial", order: 12 },
    { name: "Apelación", phase: "judicial", order: 13 },
    { name: "Sentencia de apelación", phase: "judicial", order: 14 },
    { name: "Ejecución", phase: "judicial", order: 15 },
    { name: "Archivo", phase: "judicial", order: 16 }
];

/**
 * Servicio para gestionar el seguimiento procesal de expedientes
 */
const processService = {
    /**
     * Inicia una etapa procesal para un expediente
     * @param {string} folderId - ID del expediente
     * @param {string} stageName - Nombre de la etapa a iniciar
     * @param {string} userId - ID del usuario que registra el evento
     * @param {string} notes - Notas opcionales
     * @returns {Object} Expediente actualizado
     */
    startStage: async (folderId, stageName, userId, notes = "") => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Validar que la etapa exista en la definición
            const stageDefinition = PROCESS_STAGES.find(s => s.name === stageName);
            if (!stageDefinition) {
                throw new Error(`Etapa "${stageName}" no reconocida`);
            }

            // Buscar el expediente
            const folder = await Folder.findById(folderId).session(session);
            if (!folder) {
                throw new Error("Expediente no encontrado");
            }

            // Verificar si hay alguna etapa activa y finalizarla
            if (folder.currentStage) {
                // Buscar la última vez que se inició esta etapa para calcular duración
                const lastStartEvent = await StageEvent.findOne({
                    folderId,
                    stageName: folder.currentStage,
                    eventType: "start"
                }).sort({ createdAt: -1 }).session(session);

                // Calcular duración si hay un evento de inicio previo
                const duration = lastStartEvent
                    ? Date.now() - new Date(lastStartEvent.createdAt).getTime()
                    : null;

                // Registrar finalización de la etapa actual
                await StageEvent.create([{
                    folderId,
                    stageName: folder.currentStage,
                    phase: folder.currentPhase,
                    eventType: "end",
                    stageOrder: PROCESS_STAGES.find(s => s.name === folder.currentStage)?.order || 0,
                    registeredBy: userId,
                    notes: `Finalizada automáticamente al iniciar ${stageName}`,
                    duration
                }], { session });
            }

            // Actualizar el expediente con la nueva etapa y fase
            folder.currentStage = stageName;
            folder.currentPhase = stageDefinition.phase;
            await folder.save({ session });

            // Registrar inicio de la nueva etapa
            await StageEvent.create([{
                folderId,
                stageName,
                phase: stageDefinition.phase,
                eventType: "start",
                stageOrder: stageDefinition.order,
                registeredBy: userId,
                notes
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return folder;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    /**
     * Finaliza la etapa actual de un expediente
     * @param {string} folderId - ID del expediente
     * @param {string} userId - ID del usuario que registra el evento
     * @param {string} notes - Notas opcionales
     * @returns {Object} Expediente actualizado
     */
    endCurrentStage: async (folderId, userId, notes = "") => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Buscar el expediente
            const folder = await Folder.findById(folderId).session(session);
            if (!folder) {
                throw new Error("Expediente no encontrado");
            }

            // Verificar si hay alguna etapa activa
            if (!folder.currentStage) {
                throw new Error("No hay ninguna etapa activa para finalizar");
            }

            const currentStageName = folder.currentStage;
            const currentPhase = folder.currentPhase;

            // Buscar definición de la etapa para obtener el order
            const stageDefinition = PROCESS_STAGES.find(s => s.name === currentStageName);
            const stageOrder = stageDefinition?.order || 0;

            // Buscar la última vez que se inició esta etapa para calcular duración
            const lastStartEvent = await StageEvent.findOne({
                folderId,
                stageName: currentStageName,
                eventType: "start"
            }).sort({ createdAt: -1 }).session(session);

            // Calcular duración si hay un evento de inicio previo
            const duration = lastStartEvent
                ? Date.now() - new Date(lastStartEvent.createdAt).getTime()
                : null;

            // Limpiar la etapa actual en el expediente
            folder.currentStage = null;
            // Mantener la fase actual para referencia
            await folder.save({ session });

            // Registrar finalización de la etapa
            await StageEvent.create([{
                folderId,
                stageName: currentStageName,
                phase: currentPhase,
                eventType: "end",
                stageOrder,
                registeredBy: userId,
                notes,
                duration
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return folder;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    /**
     * Obtiene todos los eventos de etapas para un expediente
     * @param {string} folderId - ID del expediente
     * @returns {Array} Lista de eventos ordenados cronológicamente
     */
    getStageEvents: async (folderId) => {
        return StageEvent.find({ folderId })
            .sort({ createdAt: 1 })
            .populate('registeredBy', 'firstname lastname email')
            .lean();
    },

    /**
     * Obtiene estadísticas del proceso para un expediente
     * @param {string} folderId - ID del expediente
     * @returns {Object} Estadísticas de etapas y fases
     */
    getProcessStats: async (folderId) => {
        // Obtener el expediente
        const folder = await Folder.findById(folderId).lean();
        if (!folder) {
            throw new Error("Expediente no encontrado");
        }

        // Obtener todos los eventos
        const events = await StageEvent.find({ folderId }).sort({ createdAt: 1 }).lean();

        // Organizar eventos por etapa
        const eventsByStage = {};
        const allStages = [...PROCESS_STAGES];

        // Inicializar estadísticas para todas las etapas posibles
        allStages.forEach(stage => {
            eventsByStage[stage.name] = {
                name: stage.name,
                phase: stage.phase,
                order: stage.order,
                events: [],
                duration: 0,
                isActive: folder.currentStage === stage.name,
                hasStarted: false,
                hasEnded: false,
                startDate: null,
                endDate: null
            };
        });

        // Procesar eventos
        events.forEach(event => {
            if (!eventsByStage[event.stageName]) {
                // Por si hay algún evento para una etapa que ya no está en la definición
                eventsByStage[event.stageName] = {
                    name: event.stageName,
                    phase: event.phase,
                    order: event.stageOrder,
                    events: [],
                    duration: 0,
                    isActive: folder.currentStage === event.stageName,
                    hasStarted: false,
                    hasEnded: false,
                    startDate: null,
                    endDate: null
                };
            }

            // Añadir evento al historial de la etapa
            eventsByStage[event.stageName].events.push({
                type: event.eventType,
                date: event.createdAt,
                notes: event.notes,
                registeredBy: event.registeredBy
            });

            // Actualizar información de la etapa según el tipo de evento
            if (event.eventType === "start") {
                eventsByStage[event.stageName].hasStarted = true;
                eventsByStage[event.stageName].startDate = event.createdAt;
            } else if (event.eventType === "end") {
                eventsByStage[event.stageName].hasEnded = true;
                eventsByStage[event.stageName].endDate = event.createdAt;
                if (event.duration) {
                    eventsByStage[event.stageName].duration += event.duration;
                }
            }
        });

        // Si hay una etapa activa, calcular su duración actual
        if (folder.currentStage && eventsByStage[folder.currentStage]) {
            const stage = eventsByStage[folder.currentStage];
            if (stage.hasStarted && !stage.hasEnded && stage.startDate) {
                const currentDuration = Date.now() - new Date(stage.startDate).getTime();
                stage.duration += currentDuration;
            }
        }

        // Calcular totales por fase
        let totalPrejudicialDuration = 0;
        let totalJudicialDuration = 0;

        Object.values(eventsByStage).forEach(stage => {
            if (stage.phase === "prejudicial") {
                totalPrejudicialDuration += stage.duration;
            } else if (stage.phase === "judicial") {
                totalJudicialDuration += stage.duration;
            }
        });

        // Devolver estadísticas organizadas
        return {
            currentStage: folder.currentStage,
            currentPhase: folder.currentPhase,
            stages: eventsByStage,
            totals: {
                prejudicial: {
                    milliseconds: totalPrejudicialDuration,
                    seconds: totalPrejudicialDuration / 1000,
                    minutes: totalPrejudicialDuration / (1000 * 60),
                    hours: totalPrejudicialDuration / (1000 * 60 * 60),
                    days: totalPrejudicialDuration / (1000 * 60 * 60 * 24)
                },
                judicial: {
                    milliseconds: totalJudicialDuration,
                    seconds: totalJudicialDuration / 1000,
                    minutes: totalJudicialDuration / (1000 * 60),
                    hours: totalJudicialDuration / (1000 * 60 * 60),
                    days: totalJudicialDuration / (1000 * 60 * 60 * 24)
                },
                total: {
                    milliseconds: totalPrejudicialDuration + totalJudicialDuration,
                    seconds: (totalPrejudicialDuration + totalJudicialDuration) / 1000,
                    minutes: (totalPrejudicialDuration + totalJudicialDuration) / (1000 * 60),
                    hours: (totalPrejudicialDuration + totalJudicialDuration) / (1000 * 60 * 60),
                    days: (totalPrejudicialDuration + totalJudicialDuration) / (1000 * 60 * 60 * 24)
                }
            }
        };
    }
};

module.exports = processService;