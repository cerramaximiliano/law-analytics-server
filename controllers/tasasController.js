const Tasas = require("../models/Tasas");
const TasasConfig = require("../models/TasasConfig");
const logger = require("../utils/logger");
const moment = require("moment");



exports.consultarPorFechas = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta, campo, completo, calcular, ajustarFechas } = req.query;
        const permitirAjuste = ajustarFechas === 'true'; // Nuevo parámetro opcional

        // Validar que se proporcionen los parámetros necesarios
        if (!fechaDesde || !fechaHasta || !campo) {
            return res.status(400).json({
                success: false,
                mensaje: 'Se requieren fechaDesde, fechaHasta y campo'
            });
        }

        // Verificar que el campo solicitado sea válido
        const camposValidos = [
            'tasaPasivaBNA', 'tasaPasivaBCRA', 'tasaActivaBNA',
            'cer', 'icl', 'tasaActivaCNAT2601', 'tasaActivaCNAT2658', 'tasaActivaCNAT2764', 'tasaActivaTnaBNA',
        ];

        if (!camposValidos.includes(campo)) {
            return res.status(400).json({
                success: false,
                mensaje: `Campo inválido. Campos permitidos: ${camposValidos.join(', ')}`
            });
        }

        // Obtener la configuración de la tasa para validar fechas y determinar tipo
        const configTasa = await TasasConfig.findOne({ tipoTasa: campo });

        if (!configTasa) {
            return res.status(400).json({
                success: false,
                mensaje: `No se encontró configuración para el tipo de tasa: ${campo}`
            });
        }

        // Validar que la tasa esté activa
        if (!configTasa.activa) {
            return res.status(400).json({
                success: false,
                mensaje: `La tasa "${campo}" no está activa en el sistema`
            });
        }

        const isCalcular = calcular === 'true';

        // Validar y transformar fechas en múltiples formatos
        let fechaDesdeNormalizada, fechaHastaNormalizada;

        try {
            // Definir expresiones regulares para validar los diferentes formatos
            const patronesFecha = [
                /^(0[1-9]|[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2]|[1-9])\/\d{4}$/, // DD/MM/YYYY
                /^(0[1-9]|[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2]|[1-9])-\d{4}$/,   // DD-MM-YYYY
                /^\d{4}-(0[1-9]|1[0-2]|[1-9])-(0[1-9]|[1-9]|[12]\d|3[01])$/,   // YYYY-MM-DD
                /^\d{4}\/(0[1-9]|1[0-2]|[1-9])\/(0[1-9]|[1-9]|[12]\d|3[01])$/  // YYYY/MM/DD
            ];

            // Verificar si las fechas coinciden con alguno de los formatos aceptados
            const esDesdeValido = patronesFecha.some(patron => patron.test(fechaDesde));
            const esHastaValido = patronesFecha.some(patron => patron.test(fechaHasta));

            if (!esDesdeValido || !esHastaValido) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Las fechas deben tener uno de estos formatos: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD o YYYY/MM/DD'
                });
            }

            // Determinar el formato de la fecha para usar el parser correcto
            let formatoDesde, formatoHasta;

            // Detectar formato para fechaDesde
            if (/^\d{4}/.test(fechaDesde)) {
                // Si empieza con 4 dígitos, es formato YYYY-MM-DD o YYYY/MM/DD
                formatoDesde = fechaDesde.includes('-') ? 'YYYY-MM-DD' : 'YYYY/MM/DD';
            } else {
                // Si no, es formato DD/MM/YYYY o DD-MM-YYYY
                formatoDesde = fechaDesde.includes('/') ? 'DD/MM/YYYY' : 'DD-MM-YYYY';
            }

            // Detectar formato para fechaHasta
            if (/^\d{4}/.test(fechaHasta)) {
                formatoHasta = fechaHasta.includes('-') ? 'YYYY-MM-DD' : 'YYYY/MM/DD';
            } else {
                formatoHasta = fechaHasta.includes('/') ? 'DD/MM/YYYY' : 'DD-MM-YYYY';
            }

            // Usar el método utc explícitamente y establecer hora, minuto, segundo a 0
            fechaDesdeNormalizada = moment.utc(fechaDesde, formatoDesde)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate();

            fechaHastaNormalizada = moment.utc(fechaHasta, formatoHasta)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate();

            // Verificar si las fechas son válidas después de la conversión
            if (!fechaDesdeNormalizada.getTime() || !fechaHastaNormalizada.getTime()) {
                throw new Error('Fechas inválidas después de la conversión');
            }

        } catch (error) {
            return res.status(400).json({
                success: false,
                mensaje: 'Error al procesar las fechas. Asegúrese de que sean fechas válidas en uno de los formatos aceptados.'
            });
        }

        // VALIDACIÓN IMPORTANTE: Comprobar que las fechas solicitadas están dentro del rango disponible en la configuración
        const fechaInicioConfig = moment.utc(configTasa.fechaInicio).startOf('day');
        const fechaUltimaConfig = moment.utc(configTasa.fechaUltima).startOf('day');
        const fechaDesdeRequest = moment.utc(fechaDesdeNormalizada).startOf('day');
        const fechaHastaRequest = moment.utc(fechaHastaNormalizada).startOf('day');

        // Preparar información de rango disponible para mensajes de error
        const rangoDisponible = `${fechaInicioConfig.format('DD/MM/YYYY')} hasta ${fechaUltimaConfig.format('DD/MM/YYYY')}`;

        // Objeto para rastrear las modificaciones realizadas a los parámetros
        let modificaciones = {
            fechaDesdeAjustada: false,
            fechaHastaAjustada: false,
            fechaDesdeOriginal: fechaDesdeNormalizada,
            fechaHastaOriginal: fechaHastaNormalizada
        };

        // Si ambas fechas están fuera del rango disponible (sin intersección)
        if (fechaDesdeRequest.isAfter(fechaUltimaConfig) || fechaHastaRequest.isBefore(fechaInicioConfig)) {
            return res.status(400).json({
                success: false,
                mensaje: `Las fechas solicitadas (${fechaDesdeRequest.format('DD/MM/YYYY')} a ${fechaHastaRequest.format('DD/MM/YYYY')}) están fuera del rango disponible para ${campo} (${rangoDisponible})`,
                rangoDisponible: {
                    desde: fechaInicioConfig.toDate(),
                    hasta: fechaUltimaConfig.toDate()
                }
            });
        }

        // Validar/ajustar fechaDesde si está antes del inicio de datos disponibles
        if (fechaDesdeRequest.isBefore(fechaInicioConfig)) {
            if (permitirAjuste) {
                // Ajustar la fecha si el usuario lo permite
                modificaciones.fechaDesdeAjustada = true;
                fechaDesdeNormalizada = fechaInicioConfig.toDate();
                logger.info(`Fecha "desde" ajustada al inicio de datos disponibles: ${fechaInicioConfig.format('DD/MM/YYYY')}`);
            } else {
                // Rechazar la solicitud si no se permite ajuste
                return res.status(400).json({
                    success: false,
                    mensaje: `La fecha inicial solicitada (${fechaDesdeRequest.format('DD/MM/YYYY')}) es anterior al primer dato disponible para ${campo} (${fechaInicioConfig.format('DD/MM/YYYY')}).`,
                    sugerencia: `Utilice ?ajustarFechas=true para ajustar automáticamente al rango disponible o modifique su consulta.`,
                    rangoDisponible: {
                        desde: fechaInicioConfig.toDate(),
                        hasta: fechaUltimaConfig.toDate()
                    }
                });
            }
        }

        // Validar/ajustar fechaHasta si está después del último dato disponible
        if (fechaHastaRequest.isAfter(fechaUltimaConfig)) {
            if (permitirAjuste) {
                // Ajustar la fecha si el usuario lo permite
                modificaciones.fechaHastaAjustada = true;
                fechaHastaNormalizada = fechaUltimaConfig.toDate();
                logger.info(`Fecha "hasta" ajustada al último dato disponible: ${fechaUltimaConfig.format('DD/MM/YYYY')}`);
            } else {
                // Rechazar la solicitud si no se permite ajuste
                return res.status(400).json({
                    success: false,
                    mensaje: `La fecha final solicitada (${fechaHastaRequest.format('DD/MM/YYYY')}) es posterior al último dato disponible para ${campo} (${fechaUltimaConfig.format('DD/MM/YYYY')}).`,
                    sugerencia: `Utilice ?ajustarFechas=true para ajustar automáticamente al rango disponible o modifique su consulta.`,
                    rangoDisponible: {
                        desde: fechaInicioConfig.toDate(),
                        hasta: fechaUltimaConfig.toDate()
                    }
                });
            }
        }

        // Verificar fechas faltantes solo para tasas de interés diario
        let fechasFaltantesEnRango = [];
        if (configTasa.tipoIndice === 'interesDiario' && Array.isArray(configTasa.fechasFaltantes) && configTasa.fechasFaltantes.length > 0) {
            fechasFaltantesEnRango = configTasa.fechasFaltantes.filter(fecha => {
                const fechaFaltante = moment.utc(fecha).startOf('day');
                return fechaFaltante.isSameOrAfter(moment.utc(fechaDesdeNormalizada).startOf('day')) &&
                    fechaFaltante.isSameOrBefore(moment.utc(fechaHastaNormalizada).startOf('day'));
            });

            if (fechasFaltantesEnRango.length > 0 && isCalcular) {
                // Para cálculos, advertir sobre fechas faltantes pero continuar
                logger.warn(`Cálculo con fechas faltantes para ${campo}: ${fechasFaltantesEnRango.map(f => moment.utc(f).format('DD/MM/YYYY')).join(', ')}`);
            }
        }

        // Seleccionar campos a devolver
        let proyeccion = { fecha: 1, _id: 0 };
        proyeccion[campo] = 1;

        // Ejecutar la consulta según los parámetros
        let datos;
        let resultado = null;
        const isCompleto = completo === 'true' ||
            (isCalcular && configTasa.tipoIndice === 'interesDiario');

        // PARTE 1: Obtener los datos
        if (isCompleto) {
            // Necesitamos todos los datos para el cálculo de interés diario o si se pidió completo
            const fechaDesdeInicio = moment.utc(fechaDesdeNormalizada).startOf('day').toDate();
            const fechaHastaFin = moment.utc(fechaHastaNormalizada).endOf('day').toDate();

            // Consulta por rango de fechas
            const consulta = {
                fecha: {
                    $gte: fechaDesdeInicio,
                    $lte: fechaHastaFin
                }
            };

            // Devolver todos los registros dentro del rango
            datos = await Tasas.find(consulta, proyeccion).sort({ fecha: 1 });

            // Verificar si tenemos datos
            if (datos.length === 0) {
                return res.status(404).json({
                    success: false,
                    mensaje: `No se encontraron datos para el rango de fechas solicitado (${moment.utc(fechaDesdeNormalizada).format('DD/MM/YYYY')} a ${moment.utc(fechaHastaNormalizada).format('DD/MM/YYYY')})`,
                    rangoDisponible: {
                        desde: fechaInicioConfig.toDate(),
                        hasta: fechaUltimaConfig.toDate()
                    }
                });
            }
        } else {
            // Para índices indexados o cuando no se pide cálculo, solo necesitamos inicio/fin
            const fechaDesdeInicio = moment.utc(fechaDesdeNormalizada).startOf('day').toDate();
            const fechaHastaFin = moment.utc(fechaHastaNormalizada).endOf('day').toDate();

            // Buscar el registro más cercano a fechaDesde (el registro exacto o el más reciente anterior)
            let registroInicial = await Tasas.findOne(
                { fecha: fechaDesdeInicio },
                proyeccion
            );

            // Si no hay registro exacto, buscar el más cercano anterior
            if (!registroInicial) {
                registroInicial = await Tasas.findOne(
                    { fecha: { $lte: fechaDesdeInicio } },
                    proyeccion
                ).sort({ fecha: -1 }); // Ordenar descendente para obtener el más cercano inferior
            }

            // Intentar con el siguiente registro si no hay anteriores
            if (!registroInicial) {
                registroInicial = await Tasas.findOne(
                    { fecha: { $gte: fechaDesdeInicio } },
                    proyeccion
                ).sort({ fecha: 1 });

                if (!registroInicial) {
                    return res.status(404).json({
                        success: false,
                        mensaje: `No se encontraron datos cercanos a la fecha inicial (${moment.utc(fechaDesdeNormalizada).format('DD/MM/YYYY')})`,
                        rangoDisponible: {
                            desde: fechaInicioConfig.toDate(),
                            hasta: fechaUltimaConfig.toDate()
                        }
                    });
                }
            }

            // Buscar registro exacto para fechaHasta
            let registroFinal = await Tasas.findOne(
                { fecha: fechaHastaFin },
                proyeccion
            );

            // Si no hay registro exacto, buscar el más cercano anterior
            if (!registroFinal) {
                registroFinal = await Tasas.findOne(
                    { fecha: { $lte: fechaHastaFin } },
                    proyeccion
                ).sort({ fecha: -1 }); // Obtener el más reciente hasta la fecha final
            }

            if (!registroFinal) {
                return res.status(404).json({
                    success: false,
                    mensaje: `No se encontraron datos cercanos a la fecha final (${moment.utc(fechaHastaNormalizada).format('DD/MM/YYYY')})`,
                    rangoDisponible: {
                        desde: fechaInicioConfig.toDate(),
                        hasta: fechaUltimaConfig.toDate()
                    }
                });
            }

            datos = {
                inicio: registroInicial,
                fin: registroFinal
            };

            // Verificar que los registros sean diferentes para cálculos
            if (isCalcular &&
                moment(registroInicial.fecha).isSame(moment(registroFinal.fecha), 'day')) {

                // Si estamos calculando y las fechas son iguales, buscar un registro anterior
                if (configTasa.tipoIndice === 'indexado') {
                    // Para indexados, necesitamos un registro anterior
                    const registroAnterior = await Tasas.findOne(
                        { fecha: { $lt: registroInicial.fecha } },
                        proyeccion
                    ).sort({ fecha: -1 });

                    if (registroAnterior) {
                        datos.inicio = registroAnterior;
                    } else {
                        return res.status(400).json({
                            success: false,
                            mensaje: `No se puede calcular la variación para ${campo}: se requieren al menos dos registros diferentes y solo hay uno disponible`
                        });
                    }
                }
            }
        }

        // PARTE 2: Realizar cálculos si se solicitó
        if (isCalcular) {
            // Aplicar el cálculo según el tipo de índice
            const tipoIndice = configTasa.tipoIndice;

            if (tipoIndice === 'indexado') {

                let registroInicial, registroFinal;

                if (Array.isArray(datos) && datos.length > 0) {
                    // Si datos es un array (cuando completo=true), usamos el primer y último registro
                    registroInicial = datos[0];
                    registroFinal = datos[datos.length - 1];

                    // Si no hay suficientes registros, mostrar error apropiado
                    if (datos.length < 2) {
                        return res.status(400).json({
                            success: false,
                            mensaje: `No se puede calcular la variación: se necesitan al menos dos registros diferentes y solo hay ${datos.length} disponible(s)`
                        });
                    }

                    // Verificar que las fechas sean diferentes
                    if (moment(registroInicial.fecha).isSame(moment(registroFinal.fecha), 'day')) {
                        return res.status(400).json({
                            success: false,
                            mensaje: `No se puede calcular la variación: todos los registros tienen la misma fecha (${moment.utc(registroInicial.fecha).format('DD/MM/YYYY')})`
                        });
                    }
                } else if (datos && datos.inicio && datos.fin) {
                    // Si datos tiene la estructura {inicio, fin} (cuando completo=false)
                    registroInicial = datos.inicio;
                    registroFinal = datos.fin;

                    // Verificar que las fechas sean diferentes
                    if (moment(registroInicial.fecha).isSame(moment(registroFinal.fecha), 'day')) {
                        return res.status(400).json({
                            success: false,
                            mensaje: `No se puede calcular la variación: los registros de inicio (${moment.utc(registroInicial.fecha).format('DD/MM/YYYY')}) y fin (${moment.utc(registroFinal.fecha).format('DD/MM/YYYY')}) tienen la misma fecha`
                        });
                    }
                } else {
                    // No tenemos una estructura de datos válida
                    logger.error(`Error: Estructura de datos inesperada para cálculo de variación. Tipo: ${typeof datos}, Es array: ${Array.isArray(datos)}, Tiene inicio/fin: ${datos && datos.inicio && datos.fin}`);

                    return res.status(400).json({
                        success: false,
                        mensaje: `Estructura de datos inesperada para calcular la variación de ${campo}`
                    });
                }

                // Ahora verificamos que los registros tengan los valores necesarios
                if (registroInicial && registroFinal &&
                    registroInicial[campo] !== undefined && registroFinal[campo] !== undefined &&
                    registroInicial[campo] !== 0) {

                    resultado = (registroFinal[campo] / registroInicial[campo]) - 1;

                    // Si estamos en modo completo=true, actualizar la estructura de datos para la respuesta
                    if (Array.isArray(datos)) {
                        datos = {
                            inicio: registroInicial,
                            fin: registroFinal,
                            // Opcionalmente, mantener el array original en otra propiedad
                            serie: datos
                        };
                    }
                } else {
                    // Construir un mensaje de error detallado
                    const detallesError = {
                        datoInicioExiste: !!registroInicial,
                        datoFinExiste: !!registroFinal,
                        valorInicioExiste: registroInicial ? registroInicial[campo] !== undefined : false,
                        valorFinExiste: registroFinal ? registroFinal[campo] !== undefined : false,
                        valorInicioEsCero: registroInicial && registroInicial[campo] === 0,
                        valorInicio: registroInicial ? registroInicial[campo] : null,
                        valorFin: registroFinal ? registroFinal[campo] : null,
                        fechaInicio: registroInicial ? moment.utc(registroInicial.fecha).format('DD/MM/YYYY') : null,
                        fechaFin: registroFinal ? moment.utc(registroFinal.fecha).format('DD/MM/YYYY') : null
                    };

                    logger.error(`Error al calcular variación de ${campo}: ${JSON.stringify(detallesError)}`);

                    // Determinar la causa específica del error
                    let mensajeEspecifico;
                    if (!detallesError.datoInicioExiste) {
                        mensajeEspecifico = `No se encontró registro inicial para ${campo}`;
                    } else if (!detallesError.datoFinExiste) {
                        mensajeEspecifico = `No se encontró registro final para ${campo}`;
                    } else if (!detallesError.valorInicioExiste) {
                        mensajeEspecifico = `El registro inicial (${detallesError.fechaInicio}) no contiene valor para ${campo}`;
                    } else if (!detallesError.valorFinExiste) {
                        mensajeEspecifico = `El registro final (${detallesError.fechaFin}) no contiene valor para ${campo}`;
                    } else if (detallesError.valorInicioEsCero) {
                        mensajeEspecifico = `El valor inicial para ${campo} es cero (${detallesError.fechaInicio}), lo que causa división por cero`;
                    } else {
                        mensajeEspecifico = `Valores inconsistentes: inicio=${detallesError.valorInicio}, fin=${detallesError.valorFin}`;
                    }

                    return res.status(400).json({
                        success: false,
                        mensaje: `Datos insuficientes o inválidos para calcular la variación de ${campo}: ${mensajeEspecifico}`,
                        detalles: detallesError
                    });
                }

            } else if (tipoIndice === 'interesDiario') {
                // Para tasas de interés diario: acumulación de factores diarios
                if (Array.isArray(datos) && datos.length > 0) {
                    let sumatoria = 0; // Inicializar la sumatoria en 0
                    let todosValidos = true;
                    let diasConDatos = 0;

                    for (const registro of datos) {
                        const valor = registro[campo];
                        if (valor !== undefined && !isNaN(valor)) {
                            // Sumar el valor directamente
                            sumatoria += valor;
                            diasConDatos++;
                        } else {
                            todosValidos = false;
                        }
                    }

                    if (todosValidos && diasConDatos > 0) {
                        // Dividir la sumatoria por 100
                        resultado = sumatoria / 100;
                    } else if (diasConDatos > 0) {
                        // Si hay algunos datos válidos, calcular pero advertir
                        resultado = sumatoria / 100;
                        logger.warn(`Cálculo parcial para ${campo}: algunos registros no tienen valores válidos`);
                    } else {
                        return res.status(400).json({
                            success: false,
                            mensaje: `No se encontraron valores válidos para calcular ${campo} en el rango de fechas solicitado`
                        });
                    }
                } else {
                    return res.status(400).json({
                        success: false,
                        mensaje: `No hay datos disponibles para calcular ${campo} en el rango solicitado`
                    });
                }
            }
        }

        // Construir la respuesta según lo solicitado
        let respuesta = {
            success: true,
            parametros: {
                fechaDesde: fechaDesdeNormalizada,
                fechaHasta: fechaHastaNormalizada,
                campo,
                completo: isCompleto,
                permitirAjuste
            }
        };

        // Agregar información sobre ajustes realizados
        if (modificaciones.fechaDesdeAjustada || modificaciones.fechaHastaAjustada) {
            respuesta.ajustes = {
                mensaje: "Algunas fechas fueron ajustadas al rango disponible según el parámetro ajustarFechas=true",
                fechaDesdeAjustada: modificaciones.fechaDesdeAjustada,
                fechaHastaAjustada: modificaciones.fechaHastaAjustada,
                fechaDesdeOriginal: modificaciones.fechaDesdeOriginal,
                fechaHastaOriginal: modificaciones.fechaHastaOriginal
            };
        }

        // Información sobre la configuración de la tasa
        respuesta.configTasa = {
            tipoIndice: configTasa.tipoIndice,
            descripcion: configTasa.descripcion,
            rangoDisponible: {
                desde: configTasa.fechaInicio,
                hasta: configTasa.fechaUltima
            }
        };

        // Agregar advertencias si corresponde
        if (fechasFaltantesEnRango.length > 0) {
            respuesta.advertencias = {
                fechasFaltantes: fechasFaltantesEnRango.map(f => moment.utc(f).format('DD/MM/YYYY'))
            };
        }

        // Agregar datos y/o resultado según corresponda
        if (isCalcular) {
            respuesta.resultado = resultado;

            // Agregar detalles del cálculo para depuración
            respuesta.detalleCalculo = {
                tipoIndice: configTasa.tipoIndice
            };

            if (configTasa.tipoIndice === 'indexado') {
                respuesta.detalleCalculo.valorInicial = datos.inicio ? datos.inicio[campo] : null;
                respuesta.detalleCalculo.valorFinal = datos.fin ? datos.fin[campo] : null;
                respuesta.detalleCalculo.fechaInicial = datos.inicio ? datos.inicio.fecha : null;
                respuesta.detalleCalculo.fechaFinal = datos.fin ? datos.fin.fecha : null;
                respuesta.detalleCalculo.formula = "(valorFinal / valorInicial) - 1";
            } else {
                respuesta.detalleCalculo.cantidadRegistros = Array.isArray(datos) ? datos.length : 0;
                respuesta.detalleCalculo.formula = "Acumulación multiplicativa: (1 + tasa/100)";
            }

            // Si se solicitan los datos completos o si son necesarios para el cálculo
            if (isCompleto) {
                respuesta.datos = datos;
            } else {
                respuesta.datos = datos; // inicio/fin para indexados
            }
        } else {
            respuesta.datos = datos;
        }

        return res.status(200).json(respuesta);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al consultar datos por fechas',
            error: error.message
        });
    }
};

exports.obtenerTasasConfig = async (req, res) => {
    try {
        // Obtener solo las tasas activas
        const tasas = await TasasConfig.find({ activa: true })
            .select('tipoTasa descripcion fechaInicio fechaUltima')
            .sort('descripcion');

        // Transformar los datos para el SelectField
        const tasasFormateadas = tasas.map(tasa => ({
            value: tasa.tipoTasa,
            label: formatearNombreTasa(tasa.tipoTasa) || tasa.descripcion,
            fechaInicio: tasa.fechaInicio,
            fechaUltima: tasa.fechaUltima
        }));

        return res.status(200).json(tasasFormateadas);
    } catch (error) {
        console.error('Error al obtener tasas:', error);
        return res.status(500).json({ mensaje: 'Error al obtener las tasas' });
    }
};

function formatearNombreTasa(tipoTasa) {
    const formateo = {
        'tasaPasivaBNA': 'Tasa Pasiva Banco Nación',
        'tasaPasivaBCRA': 'Tasa Pasiva BCRA',
        'tasaActivaBNA': 'Tasa Activa Banco Nación',
        'tasaActivaTnaBNA': 'Tasa Activa TNA Banco Nación',
        'cer': 'CER',
        'icl': 'ICL BCRA',
        'tasaActivaCNAT2601': 'Tasa Activa Banco Nación - Acta 2601',
        'tasaActivaCNAT2658': 'Tasa Activa Banco Nación - Acta 2658',
        'tasaActivaCNAT2764': 'Tasa Activa Banco Nación - Acta 2764'
    };

    return formateo[tipoTasa] || tipoTasa;
};