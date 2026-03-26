const CompraBoleto = require('../models/CompraBoleto');
const Recarga = require('../models/Recarga');
const Viaje = require('../models/Viaje');

const obtenerHistorialUnificado = async (req, res) => {
    try {
        const { idUsuario } = req.params;

        // Paginación y filtros opcionales desde la URL (ej: ?limite=50&filtro=todos)
        const limite = parseInt(req.query.limite) || 50;
        const filtro = req.query.filtro || 'todos';

        // Promesas en paralelo con .lean()
        // .lean() hace que Mongoose devuelva objetos JS puros en lugar dedocumentos pesados de Mongoose
        const [comprasRaw, recargasRaw, viajesRaw] = await Promise.all([
            (filtro === 'todos' || filtro === 'compras') ? CompraBoleto.find({ idUsuario }).lean() : [],
            (filtro === 'todos' || filtro === 'recargas') ? Recarga.find({ idUsuario }).lean() : [],
            (filtro === 'todos' || filtro === 'viajes') ? Viaje.find({ idPasajero: idUsuario }).lean() : []
        ]);

        // Mapeo a un DTO (Data Transfer Object) estandarizado para Flutter
        let historialUnificado = [];

        comprasRaw.forEach(c => {
            historialUnificado.push({
                idElemento: c._id,
                tipo: 'compra',
                titulo: `Compra de ${c.cantidadBoletos} boleto(s)`,
                subtitulo: 'Descontado de tu saldo',
                monto: -c.costoTotal, // Negativo porque restó saldo
                fecha: c.fecha
            });
        });

        recargasRaw.forEach(r => {
            historialUnificado.push({
                idElemento: r._id,
                tipo: 'recarga',
                titulo: 'Recarga de Saldo',
                subtitulo: `Método: ${r.metodoPago}`,
                monto: r.monto, // Positivo porque sumó saldo
                fecha: r.fecha
            });
        });

        viajesRaw.forEach(v => {
            historialUnificado.push({
                idElemento: v._id,
                tipo: 'viaje',
                titulo: 'Abordaje en transporte',
                subtitulo: v.estatusSincronizacion === 'nube_sincronizado' ? 'Sincronizado' : 'Pendiente',
                // El viaje no resta dinero directo, resta un boleto. Lo mandamos como 0 y usamos un campo extra.
                monto: 0,
                etiquetaExtra: 'Completado',
                fecha: v.fecha
            });
        });

        // Ordenamiento cronológico (del más reciente al más antiguo)
        historialUnificado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Aplicamos el límite de paginación
        const historialPaginado = historialUnificado.slice(0, limite);

        // Enviamos la respuesta limpia al Frontend
        res.status(200).json({
            totalMostrado: historialPaginado.length,
            historial: historialPaginado
        });

    } catch (error) {
        console.error('Error al generar historial unificado:', error);
        res.status(500).json({ error: 'Error interno al obtener el historial' });
    }
};

module.exports = { obtenerHistorialUnificado };