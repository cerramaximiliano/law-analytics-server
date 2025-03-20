const Tasas = require("../models/Tasas");
const TasasConfig = require("../models/TasasConfig");
const logger = require("../utils/logger");
const moment = require("moment");



exports.consultarPorFechas = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta, campo, completo } = req.query;
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

            // SOLUCIÓN: Usar el método utc explícitamente y establecer hora, minuto, segundo a 0
            // Esto garantiza que la fecha sea exactamente a medianoche UTC
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

        // Seleccionar campos a devolver
        let proyeccion = { fecha: 1, _id: 0 };
        proyeccion[campo] = 1;

        // Ejecutar la consulta según el valor de 'completo'
        let datos;
        const isCompleto = completo === 'true';

        if (isCompleto) {
            // SOLUCIÓN: Ajustar la consulta para buscar exactamente por YYYY-MM-DD
            // Construimos las fechas de inicio/fin del día para la consulta
            const fechaDesdeString = moment.utc(fechaDesdeNormalizada).format('YYYY-MM-DD');
            const fechaHastaString = moment.utc(fechaHastaNormalizada).format('YYYY-MM-DD');

            // Consulta por fechas como strings o usando conversión adecuada según tu schema
            const consulta = {
                $or: [
                    // Si la fecha en la base de datos está almacenada como Date
                    {
                        fecha: {
                            $gte: fechaDesdeNormalizada,
                            $lte: fechaHastaNormalizada
                        }
                    },
                    // Si la base de datos almacena fechas como strings YYYY-MM-DD
                    // (elimina esta parte si no aplica)
                    {
                        fechaString: {
                            $gte: fechaDesdeString,
                            $lte: fechaHastaString
                        }
                    }
                ]
            };

            // Devolver todos los registros dentro del rango
            datos = await Tasas.find(consulta, proyeccion).sort({ fecha: 1 });
        } else {
            // Para búsqueda exacta de un día, usamos una estrategia diferente
            // Creamos consultas que buscan específicamente el día, sin importar la hora

            const fechaDesdeInicio = moment.utc(fechaDesdeNormalizada).startOf('day').toDate();
            const fechaDesdeFin = moment.utc(fechaDesdeNormalizada).endOf('day').toDate();
            const fechaHastaInicio = moment.utc(fechaHastaNormalizada).startOf('day').toDate();
            const fechaHastaFin = moment.utc(fechaHastaNormalizada).endOf('day').toDate();

            // Buscar para fechaDesde
            const registroInicial = await Tasas.findOne(
                { fecha: { $gte: fechaDesdeInicio, $lte: fechaDesdeFin } },
                proyeccion
            ).sort({ fecha: 1 });

            // Buscar para fechaHasta
            const registroFinal = await Tasas.findOne(
                { fecha: { $gte: fechaHastaInicio, $lte: fechaHastaFin } },
                proyeccion
            ).sort({ fecha: 1 });

            datos = {
                inicio: registroInicial,
                fin: registroFinal
            };
        }

        return res.status(200).json({
            success: true,
            datos,
            parametros: {
                fechaDesde: fechaDesdeNormalizada,
                fechaHasta: fechaHastaNormalizada,
                campo,
                completo: isCompleto
            }
        });
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