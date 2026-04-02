const mongoose = require('mongoose');

const viajeSchema = new mongoose.Schema({
    idPasajero: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    idOperador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    idBoleto: {
        type: String,
        unique: true,
        sparse: true
    }, // Guarda la huella única del viaje
    estatusSincronizacion: {
        type: String,
        enum: ['local_pendiente', 'nube_sincronizado'],
        default: 'nube_sincronizado'
    },
    // En el futuro aquí podemos meter { latitud, longitud } o { idRuta }
    fecha: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Viaje', viajeSchema);