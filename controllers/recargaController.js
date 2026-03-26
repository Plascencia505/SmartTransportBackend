const Usuario = require('../models/Usuario');
const Recarga = require('../models/Recarga');

const LIMITE_MAX_RECARGA = 1000; // Límite máximo de recarga por transacción

const recargarSaldo = async (req, res) => {
    try {
        const { idUsuario, monto, metodoPago } = req.body;

        // Validación básica
        if (!monto || monto <= 0) {
            return res.status(400).json({ error: 'El monto a recargar debe ser mayor a 0' });
        }

        if (monto > LIMITE_MAX_RECARGA) {
            return res.status(400).json({ error: `Por seguridad, la recarga máxima es de $${LIMITE_MAX_RECARGA}.` });
        }
        // Regex: Asegura que si hay punto decimal, solo tenga 1 o 2 dígitos después de él
        if (!/^\d+(\.\d{1,2})?$/.test(monto.toString())) {
            return res.status(400).json({ error: 'El monto solo puede tener hasta dos decimales (ej. 5.50).' });
        }

        const usuario = await Usuario.findById(idUsuario);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        //Le sumamos el dinero a su billetera virtual
        // Usamos (usuario.saldo || 0) por si es un usuario nuevo y el campo está vacío
        usuario.saldo = (usuario.saldo || 0) + Number(monto);
        await usuario.save();

        //Dejamos el rastro auditable en la nueva colección
        const nuevaRecarga = new Recarga({
            idUsuario: idUsuario,
            monto: Number(monto),
            metodoPago: metodoPago || 'efectivo' // Por defecto efectivo si no mandan nada
        });
        await nuevaRecarga.save();

        return res.status(200).json({
            mensaje: 'Saldo recargado con éxito',
            saldoActual: usuario.saldo
        });

    } catch (error) {
        console.error('Error al recargar saldo:', error);
        return res.status(500).json({ error: 'Error interno al procesar la recarga', detalle: error.message });
    }
};

module.exports = { recargarSaldo };