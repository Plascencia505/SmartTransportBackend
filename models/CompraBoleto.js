const mongoose = require('mongoose');

const compraBoletoSchema = new mongoose.Schema({
    idUsuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    cantidadBoletos: {
        type: Number,
        required: true
    },
    costoTotal: {
        type: Number,
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('CompraBoleto', compraBoletoSchema);