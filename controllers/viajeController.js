const Usuario = require('../models/Usuario');
const Viaje = require('../models/Viaje');
const { authenticator } = require('otplib');

const registrarViaje = async (req, res) => {
    try {
        const { idPasajero, idOperador, totp } = req.body;
        console.log(`Intentando cobrar viaje al pasajero ${idPasajero}`);

        const pasajero = await Usuario.findById(idPasajero);
        if (!pasajero) {
            return res.status(404).json({ error: 'Pasajero no encontrado' });
        }

        // -VALIDACIONES DE SEGURIDAD (TOTP)
        if (!totp) {
            return res.status(400).json({ error: 'El QR no contiene un código de seguridad.' });
        }
        if (!pasajero.totpSecret) {
            return res.status(400).json({ error: 'El pasajero no tiene semilla de seguridad configurada.' });
        }

        // Configuramos la ventana de tolerancia de lag (1 ciclo anterior, el actual, y 1 futuro)
        authenticator.options = { window: 1 };

        // Verificación con otplib (automáticamente asume base32)
        const esValido = authenticator.verify({
            token: totp,
            secret: pasajero.totpSecret
        });

        if (!esValido) {
            return res.status(401).json({ error: 'Código QR expirado o clonado. Dile al pasajero que muestre su código actual.' });
        }

        //- VALIDACIÓN DE SALDO
        if (pasajero.boletosDisponibles < 1) {
            return res.status(400).json({ error: 'Pasaje rechazado: No hay boletos disponibles' });
        }

        //- EJECUCIÓN DEL COBRO
        pasajero.boletosDisponibles -= 1;
        await pasajero.save();

        //- REGISTRO EN LA NUEVA COLECCIÓN
        const nuevoViaje = new Viaje({
            idPasajero: idPasajero,
            idOperador: idOperador,
            estatusSincronizacion: 'nube_sincronizado' // Listo para el futuro modo Offline-First
        });
        await nuevoViaje.save();

        //- MAGIA REACTIVA (SOCKETS)
        const io = req.app.get('io');
        if (io) {
            io.to(idPasajero.toString()).emit('boleto_cobrado', {
                idPasajero: idPasajero,
                boletosRestantes: pasajero.boletosDisponibles,
                mensaje: '¡Pasaje pagado con éxito!'
            });
        }

        return res.status(200).json({
            mensaje: 'Viaje registrado con éxito',
            boletosRestantes: pasajero.boletosDisponibles
        });

    } catch (error) {
        console.error('Error al registrar viaje:', error);
        return res.status(500).json({ error: 'Error interno al procesar el viaje', detalle: error.message });
    }
};

module.exports = {
    registrarViaje
};