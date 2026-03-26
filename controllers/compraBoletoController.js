const Usuario = require('../models/Usuario');
const CompraBoleto = require('../models/CompraBoleto');

const LIMITE_MAX_BOLETOS = 50; // Límite máximo de boletos por compra

const comprarBoletos = async (req, res) => {
    try {
        const { idUsuario, cantidadBoletos, costoTotal } = req.body;

        if (!Number.isInteger(cantidadBoletos)) {
            return res.status(400).json({ error: 'No se pueden comprar fracciones de boleto.' });
        }
        if (cantidadBoletos <= 0 || cantidadBoletos > LIMITE_MAX_BOLETOS) {
            return res.status(400).json({ error: `Solo puedes comprar entre 1 y ${LIMITE_MAX_BOLETOS} boletos a la vez.` });
        }

        const usuario = await Usuario.findById(idUsuario);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 1. Verificamos que no nos quieran ver la cara (Que tenga saldo suficiente)
        if ((usuario.saldo || 0) < costoTotal) {
            return res.status(400).json({ error: 'Saldo insuficiente para realizar esta compra' });
        }

        // Restamos dinero, sumamos boletos
        usuario.saldo -= Number(costoTotal);
        usuario.boletosDisponibles = (usuario.boletosDisponibles || 0) + Number(cantidadBoletos);
        await usuario.save();

        // Dejamos el recibo en la nueva colección para el historial
        const nuevaCompra = new CompraBoleto({
            idUsuario: idUsuario,
            cantidadBoletos: Number(cantidadBoletos),
            costoTotal: Number(costoTotal)
        });
        await nuevaCompra.save();

        return res.status(200).json({
            mensaje: 'Boletos comprados con éxito',
            boletosDisponibles: usuario.boletosDisponibles,
            saldoRestante: usuario.saldo
        });

    } catch (error) {
        console.error('Error al comprar boletos:', error);
        return res.status(500).json({ error: 'Error interno al procesar la compra', detalle: error.message });
    }
};

module.exports = { comprarBoletos };