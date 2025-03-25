// services/statsService.js (versión mejorada)
const UserStats = require('../models/UserStats');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Actualiza las estadísticas para un usuario específico
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - Éxito o fracaso de la operación
 */
exports.updateUserStats = async (userId) => {
    try {
        if (!userId) {
            logger.warn('Se intentó actualizar estadísticas sin proporcionar userId');
            return false;
        }

        // Verificar si el usuario existe
        const userExists = await User.exists({ _id: userId });
        if (!userExists) {
            logger.warn(`Usuario con ID ${userId} no encontrado al actualizar estadísticas`);
            return false;
        }

        const Calculator = require('../models/Calculator');
        const Folder = require('../models/Folder');
        const Movement = require('../models/Movements');
        // Descomenta y añade los demás modelos cuando los necesites
        // const Notification = require('../models/Notification');
        // const Event = require('../models/Event');
        // const Contact = require('../models/Contact');
        // const Alert = require('../models/Alert');

        // Obtener todos los contadores en paralelo para mejor rendimiento
        const [
            calculatorsCount,
            foldersCount,
            movementsCount
            // Descomenta cuando implementes los demás modelos
            // notificationsCount,
            // eventsCount,
            // contactsCount,
            // alertsCount
        ] = await Promise.all([
            Calculator.countDocuments({ userId }),
            Folder.countDocuments({ userId }),
            Movement.countDocuments({ userId })
            // Notification.countDocuments({ userId, isRead: false }),
            // Event.countDocuments({ userId, date: { $gte: new Date() } }),
            // Contact.countDocuments({ userId }),
            // Alert.countDocuments({ userId, isActive: true })
        ]);

        // Actualizar o crear el documento de estadísticas
        const updatedStats = await UserStats.findOneAndUpdate(
            { userId },
            {
                counts: {
                    calculators: calculatorsCount,
                    folders: foldersCount,
                    movements: movementsCount
                    // Descomenta cuando implementes los demás modelos
                    // notifications: notificationsCount,
                    // events: eventsCount,
                    // contacts: contactsCount,
                    // alerts: alertsCount
                },
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        logger.info(`Estadísticas actualizadas para usuario ${userId}`);
        return true;
    } catch (error) {
        logger.error(`Error al actualizar estadísticas para usuario ${userId}:`, error);
        return false;
    }
};

/**
 * Actualiza las estadísticas para todos los usuarios
 * @returns {Promise<Object>} - Resultado de la operación
 */
exports.updateAllUserStats = async () => {
    try {
        const users = await User.find({});
        logger.info(`Iniciando actualización de estadísticas para ${users.length} usuarios`);

        let successCount = 0;
        let errorCount = 0;

        // Procesar usuarios en lotes para no sobrecargar la base de datos
        const batchSize = 20;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);

            // Actualizar estadísticas para cada usuario en el lote en paralelo
            const results = await Promise.all(
                batch.map(user => exports.updateUserStats(user._id))
            );

            // Contar éxitos y fracasos
            successCount += results.filter(result => result === true).length;
            errorCount += results.filter(result => result === false).length;

            logger.info(`Procesado lote ${i / batchSize + 1}/${Math.ceil(users.length / batchSize)}`);
        }

        logger.info(`Actualización de estadísticas completada. Éxitos: ${successCount}, Errores: ${errorCount}`);
        return { success: successCount, errors: errorCount };
    } catch (error) {
        logger.error('Error al actualizar estadísticas de usuarios:', error);
        throw error;
    }
};

/**
 * Obtiene las estadísticas actualizadas para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Estadísticas del usuario
 */
exports.getUserStats = async (userId) => {
    try {
        // Buscar estadísticas existentes
        let stats = await UserStats.findOne({ userId });

        // Si no existen o están desactualizadas (más de 1 hora), actualizarlas
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (!stats || !stats.lastUpdated || stats.lastUpdated < oneHourAgo) {
            await exports.updateUserStats(userId);
            stats = await UserStats.findOne({ userId });
        }

        return stats ? stats.counts : null;
    } catch (error) {
        logger.error(`Error al obtener estadísticas para usuario ${userId}:`, error);
        throw error;
    }
};

/**
 * Incrementa o decrementa un contador específico para un usuario
 * @param {string} userId - ID del usuario
 * @param {string} entityType - Tipo de entidad (calculators, folders, etc.)
 * @param {number} change - Cantidad a cambiar (positivo para incrementar, negativo para decrementar)
 * @param {boolean} [forceSet=false] - Si es true, establece el valor directamente en lugar de incrementarlo
 * @returns {Promise<boolean>} - Éxito o fracaso de la operación
 */
exports.updateEntityCount = async (userId, entityType, change = 1, forceSet = false) => {
    try {
        if (!userId || !entityType) {
            logger.warn('Se intentó actualizar contador sin proporcionar userId o entityType');
            return false;
        }

        // Verificar que el tipo de entidad es válido
        const validEntityTypes = ['calculators', 'folders', 'movements', 'notifications', 'events', 'contacts', 'alerts'];
        if (!validEntityTypes.includes(entityType)) {
            logger.warn(`Tipo de entidad inválido: ${entityType}`);
            return false;
        }

        // Si es una operación de decremento, verificar primero el valor actual para evitar negativos
        if (!forceSet && change < 0) {
            const currentStats = await UserStats.findOne({ userId });

            // Si no hay estadísticas o el contador actual es menor o igual al valor a decrementar
            // realizar una sincronización completa para obtener el valor correcto
            if (!currentStats || !currentStats.counts ||
                currentStats.counts[entityType] === undefined ||
                currentStats.counts[entityType] <= Math.abs(change)) {

                logger.warn(`Posible valor negativo detectado para ${entityType} del usuario ${userId}. Realizando sincronización.`);

                // Determinar qué modelo usar según el tipo de entidad
                let count = 0;
                switch (entityType) {
                    case 'calculators':
                        const Calculator = require('../models/Calculator');
                        count = await Calculator.countDocuments({ userId });
                        break;
                    case 'folders':
                        const Folder = require('../models/Folder');
                        count = await Folder.countDocuments({ userId });
                        break;
                    case 'movements':
                        const Movement = require('../models/Movements');
                        count = await Movement.countDocuments({ userId });
                        break;
                    // Añadir casos para otros tipos de entidades cuando sea necesario
                    default:
                        count = 0;
                }

                // Actualizar directamente con el valor correcto
                const updateQuery = {};
                updateQuery[`counts.${entityType}`] = count;

                await UserStats.findOneAndUpdate(
                    { userId },
                    { $set: updateQuery, lastUpdated: new Date() },
                    { upsert: true, new: true }
                );

                logger.info(`Contador ${entityType} sincronizado para usuario ${userId}: ${count}`);
                return true;
            }
        }

        // Realizar la actualización
        if (forceSet) {
            // Establecer directamente el valor
            const updateQuery = {};
            updateQuery[`counts.${entityType}`] = change;

            await UserStats.findOneAndUpdate(
                { userId },
                { $set: updateQuery, lastUpdated: new Date() },
                { upsert: true, new: true }
            );

            logger.info(`Contador ${entityType} establecido para usuario ${userId}: ${change}`);
        } else {
            // Incrementar o decrementar el valor
            const updateQuery = {};
            updateQuery[`counts.${entityType}`] = change;

            // Usar $max para asegurar que nunca sea menor que 0
            if (change < 0) {
                await UserStats.findOneAndUpdate(
                    { userId },
                    [
                        { $set: { lastUpdated: new Date() } },
                        {
                            $set: {
                                [`counts.${entityType}`]: {
                                    $max: [0, { $add: [{ $ifNull: [`$counts.${entityType}`, 0] }, change] }]
                                }
                            }
                        }
                    ],
                    { upsert: true, new: true }
                );
            } else {
                await UserStats.findOneAndUpdate(
                    { userId },
                    {
                        $inc: updateQuery,
                        $set: { lastUpdated: new Date() }
                    },
                    { upsert: true, new: true }
                );
            }

            logger.info(`Contador ${entityType} actualizado para usuario ${userId} (${change > 0 ? '+' : ''}${change})`);
        }

        return true;
    } catch (error) {
        logger.error(`Error al actualizar contador ${entityType} para usuario ${userId}:`, error);
        return false;
    }
};

// Verifica y repara contadores negativos para todos los usuarios y entidades
exports.repairNegativeCounters = async () => {
    try {
        const stats = await UserStats.find({});
        logger.info(`Verificando contadores negativos para ${stats.length} usuarios`);

        let repairCount = 0;

        for (const userStat of stats) {
            let needsUpdate = false;
            const updatedCounts = { ...userStat.counts };

            // Comprobar cada contador
            for (const [entityType, count] of Object.entries(userStat.counts)) {
                if (count < 0) {
                    logger.warn(`Contador negativo detectado: ${entityType} = ${count} para usuario ${userStat.userId}`);

                    // Realizar recuento real
                    let actualCount = 0;

                    switch (entityType) {
                        case 'calculators':
                            const Calculator = require('../models/Calculator');
                            actualCount = await Calculator.countDocuments({ userId: userStat.userId });
                            break;
                        case 'folders':
                            const Folder = require('../models/Folder');
                            actualCount = await Folder.countDocuments({ userId: userStat.userId });
                            break;
                        case 'movements':
                            const Movement = require('../models/Movements');
                            actualCount = await Movement.countDocuments({ userId: userStat.userId });
                            break;
                        // Añadir casos para otros tipos de entidades
                        default:
                            actualCount = 0;
                    }

                    updatedCounts[entityType] = actualCount;
                    needsUpdate = true;
                    repairCount++;
                }
            }

            // Actualizar si es necesario
            if (needsUpdate) {
                await UserStats.findByIdAndUpdate(
                    userStat._id,
                    {
                        $set: {
                            counts: updatedCounts,
                            lastUpdated: new Date()
                        }
                    }
                );
                logger.info(`Contadores reparados para usuario ${userStat.userId}`);
            }
        }

        logger.info(`Reparación de contadores completada. Se corrigieron ${repairCount} contadores negativos.`);
        return { repaired: repairCount };
    } catch (error) {
        logger.error(`Error al reparar contadores negativos: ${error.message}`);
        throw error;
    }
};

// Exportación para pruebas
module.exports = exports;