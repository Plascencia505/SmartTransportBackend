const Usuario = require('../models/Usuario');
const Viaje = require('../models/Viaje');
const { authenticator } = require('otplib');

// Registro de viaje (cobro en tiempo real)
const registrarViaje = async (req, res) => {
    try {
        const { idPasajero, idOperador, totp } = req.body;
        console.log(`Intentando cobrar viaje al pasajero ${idPasajero}`);

        const pasajero = await Usuario.findById(idPasajero);
        if (!pasajero) {
            return res.status(404).json({ error: 'Pasajero no encontrado' });
        }

        // TOTP en tiempo real
        if (!totp) {
            return res.status(400).json({ error: 'El QR no contiene un código de seguridad.' });
        }
        if (!pasajero.totpSecret) {
            return res.status(400).json({ error: 'El pasajero no tiene semilla de seguridad configurada.' });
        }

        // Configuramos la ventana de tolerancia de lag (1 ciclo anterior, el actual, y 1 futuro)
        authenticator.options = { window: 1 };
        const esValido = authenticator.verify({
            token: totp,
            secret: pasajero.totpSecret
        });

        if (!esValido) {
            return res.status(401).json({ error: 'Código QR expirado o clonado.' });
        }

        // Verificación del adeudo de boletos, no más de 4 viajes en negativo permitidos
        if (pasajero.boletosDisponibles <= -4) {
            return res.status(400).json({ error: 'Pasaje rechazado: Límite de adeudo superado (-4 boletos).' });
        }

        // Restamos un boleto al pasajero (puede quedar en negativo hasta -4)
        pasajero.boletosDisponibles -= 1;
        await pasajero.save();

        // Registramos el viaje en la base de datos
        const nuevoViaje = new Viaje({
            idPasajero: idPasajero,
            idOperador: idOperador,
            estatusSincronizacion: 'nube_sincronizado'
        });
        await nuevoViaje.save();

        // Socket: Avisar al usuario en tiempo real (si tiene la app abierta) que su boleto fue cobrado y cuántos boletos le quedan
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

// Offline a Online (Sincronización de viajes diferidos)
const sincronizarLote = async (req, res) => {
    try {
        const { idOperador, viajes } = req.body;

        if (!viajes || !Array.isArray(viajes)) {
            return res.status(400).json({ error: 'Formato de viajes incorrecto' });
        }

        console.log(`[SYNC] Procesando lote de ${viajes.length} viajes diferidos del operador ${idOperador}`);

        const io = req.app.get('io');
        const resultados = []; // Para avisarle al chofer cuáles borrar de su SQLite

        // Procesamos uno por uno
        for (const viajeOffline of viajes) {
            // id es el de SQLite, no confundir con el _id de Mongo.
            const { id, idPasajero, totpScaneado, fechaHoraEscaneo } = viajeOffline;

            try {
                const pasajero = await Usuario.findById(idPasajero);

                if (!pasajero || !pasajero.totpSecret) {
                    resultados.push({ idSQLite: id, status: 'rechazado', motivo: 'Pasajero inexistente' });
                    continue; // Saltamos al siguiente viaje
                }

                // clone de autenticador para no afectar el global
                const authOffline = authenticator.clone();

                // Le decimos a la librería que la "hora actual" es la hora en la que se escaneó
                authOffline.options = {
                    epoch: new Date(fechaHoraEscaneo).getTime(),
                    window: 1
                };

                const esValido = authOffline.verify({
                    token: totpScaneado,
                    secret: pasajero.totpSecret
                });

                if (!esValido) {
                    resultados.push({ idSQLite: id, status: 'rechazado', motivo: 'Fraude detectado: TOTP inválido para esa hora' });
                    continue;
                }

                // Validación de adeudo, no más de 4 viajes en negativo permitidos
                if (pasajero.boletosDisponibles <= -4) {
                    resultados.push({ idSQLite: id, status: 'rechazado', motivo: 'Límite de adeudo máximo' });
                    // Opcional: Aquí podrías ejecutar pasajero.cuentaBloqueada = true
                    continue;
                }

                // Cobrar el viaje restando un boleto (puede quedar en negativo hasta -4)
                pasajero.boletosDisponibles -= 1;
                await pasajero.save();

                // Registramos el viaje en la base de datos con la fecha real del escaneo, no la de sincronización
                const nuevoViaje = new Viaje({
                    idPasajero: idPasajero,
                    idOperador: idOperador,
                    estatusSincronizacion: 'nube_sincronizado',
                    fecha: fechaHoraEscaneo
                });
                await nuevoViaje.save();

                resultados.push({ idSQLite: id, status: 'exito' });

                // Avisar por si tiene la app abierta que su boleto fue cobrado y cuántos boletos le quedan
                if (io) {
                    io.to(idPasajero.toString()).emit('boleto_cobrado', {
                        idPasajero: idPasajero,
                        boletosRestantes: pasajero.boletosDisponibles,
                        mensaje: 'Viaje pendiente procesado'
                    });
                }

            } catch (errItem) {
                console.error(`Error procesando viaje SQLite ${id}:`, errItem);
                // Si el servidor falla internamente, marcamos 'error' para que el chofer lo intente de nuevo más tarde
                resultados.push({ idSQLite: id, status: 'error' });
            }
        }

        // Le regresamos la lista de resultados al teléfono del chofer
        return res.status(200).json({
            mensaje: 'Sincronización completada',
            resultados: resultados
        });

    } catch (error) {
        console.error('Error masivo en sincronizarLote:', error);
        return res.status(500).json({ error: 'Error interno de sincronización' });
    }
};

module.exports = {
    registrarViaje,
    sincronizarLote
};