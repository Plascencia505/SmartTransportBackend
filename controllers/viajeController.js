const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const Viaje = require('../models/Viaje');

// Función para validar la firma HMAC del boleto
const validarFirma = (idBoleto, firmaEnviada, secret) => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(idBoleto);
    const firmaCalculada = hmac.digest('hex');
    return firmaCalculada === firmaEnviada;
};

// Viajes en tiempo real con validación antifraude
const registrarViaje = async (req, res) => {
    try {
        const { idPasajero, idOperador, idBoleto, firma } = req.body;
        console.log(`Intentando cobrar viaje al pasajero ${idPasajero}`);

        const pasajero = await Usuario.findById(idPasajero);
        if (!pasajero) return res.status(404).json({ error: 'Pasajero no encontrado' });
        if (!pasajero.totpSecret) return res.status(400).json({ error: 'Usuario sin secreto configurado' });

        // Validación matemática de la firma HMAC del boleto
        const esValido = validarFirma(idBoleto, firma, pasajero.totpSecret);
        if (!esValido) {
            return res.status(401).json({ error: 'Firma criptográfica inválida. Boleto corrupto.' });
        }

        // Antifraude: Verificar que el boleto no haya sido utilizado antes (clonado)
        const viajePrevio = await Viaje.findOne({ idBoleto: idBoleto });
        if (viajePrevio) {
            return res.status(401).json({ error: 'Fraude: Este boleto ya fue utilizado anteriormente.' });
        }

        // Validación de saldo (con un margen de -4 boletos para permitir viajes en adeudo)
        if (pasajero.boletosDisponibles <= -4) {
            return res.status(400).json({ error: 'Pasaje rechazado: Límite de adeudo superado (-4 boletos).' });
        }

        // EJECUCIÓN
        pasajero.boletosDisponibles -= 1;
        await pasajero.save();
        console.log(`Viaje registrado para pasajero ${idPasajero}. Boletos restantes: ${pasajero.boletosDisponibles}`);

        const nuevoViaje = new Viaje({
            idPasajero,
            idOperador,
            idBoleto, // Guardamos el UUID para quemarlo
            estatusSincronizacion: 'nube_sincronizado'
        });
        await nuevoViaje.save();

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
        return res.status(500).json({ error: 'Error interno' });
    }
};

// Procesamiento de viajes offline diferidos en lote con hmac y validaciones antifraude adicionales
const sincronizarLote = async (req, res) => {
    try {
        const { idOperador, viajes } = req.body;
        if (!viajes || !Array.isArray(viajes)) return res.status(400).json({ error: 'Formato incorrecto' });

        console.log(`[SYNC] Procesando lote de ${viajes.length} viajes diferidos del operador ${idOperador}`);

        const io = req.app.get('io');
        const resultados = [];

        for (const viajeOffline of viajes) {
            const { id, idPasajero, idBoleto, firma, fechaHoraEscaneo } = viajeOffline;

            try {
                const pasajero = await Usuario.findById(idPasajero);
                if (!pasajero || !pasajero.totpSecret) {
                    resultados.push({ idSQLite: id, status: 'rechazado', motivo: 'Pasajero inexistente' });
                    continue;
                }

                // 1. VALIDACIÓN MATEMÁTICA
                const esValido = validarFirma(idBoleto, firma, pasajero.totpSecret);
                if (!esValido) {
                    resultados.push({ idSQLite: id, status: 'rechazado', motivo: 'Firma inválida' });
                    continue;
                }

                // 2. VALIDACIÓN ANTIFRAUDE EN LOTE
                const viajePrevio = await Viaje.findOne({ idBoleto: idBoleto });
                if (viajePrevio) {
                    resultados.push({ idSQLite: id, status: 'rechazado', motivo: 'Boleto reciclado (clonado)' });
                    continue;
                }

                if (pasajero.boletosDisponibles <= -4) {
                    resultados.push({ idSQLite: id, status: 'rechazado', motivo: 'Límite de adeudo máximo' });
                    continue;
                }

                const pasajeroActualizado = await Usuario.findByIdAndUpdate(
                    idPasajero,
                    { $inc: { boletosDisponibles: -1 } },
                    { new: true }
                );

                const nuevoViaje = new Viaje({
                    idPasajero,
                    idOperador,
                    idBoleto, // Lo quemamos retroactivamente
                    estatusSincronizacion: 'nube_sincronizado',
                    fecha: fechaHoraEscaneo
                });
                await nuevoViaje.save();

                resultados.push({ idSQLite: id, status: 'exito' });

                if (io) {
                    io.to(idPasajero.toString()).emit('boleto_cobrado', {
                        idPasajero: idPasajero,
                        boletosRestantes: pasajeroActualizado.boletosDisponibles,
                        mensaje: 'Viaje pendiente procesado'
                    });
                }

            } catch (errItem) {
                console.error(`[SYNC] Error en viaje SQLite ID ${id}:`, errItem);
                resultados.push({ idSQLite: id, status: 'error' });
            }
        }
        console.log(`[SYNC] Lote finalizado.`);
        return res.status(200).json({ mensaje: 'Sincronización completada', resultados: resultados });

    } catch (error) {
        return res.status(500).json({ error: 'Error interno de sincronización' });
    }
};

module.exports = { registrarViaje, sincronizarLote };