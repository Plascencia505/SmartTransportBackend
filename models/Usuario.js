const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombres: {
    type: String,
    required: true
  }, // Nombre del usuario, obligatorio
  apellidos: {
    type: String,
    required: true
  }, // Apellidos del usuario, obligatorio
  telefono: {
    type: String,
    required: true
  }, // Teléfono del usuario, obligatorio
  correo: {
    type: String,
    required: true,
    unique: true
  }, // Correo electrónico del usuario, obligatorio y único
  password: {
    type: String,
    required: true
  }, // Contraseña del usuario, obligatoria
  ocupacion: {
    type: String,
    required: true
  }, // Ocupación del usuario (general o estudiante), obligatoria
  numeroCuenta: {
    type: String,
    default: ""
  }, // Número de cuenta para estudiantes, opcional
  fechaNacimiento: {
    type: Date,
    required: true
  },  // Fecha de nacimiento del usuario, obligatoria
  curp: {
    type: String,
    required: true
  }, // curp del usuario, obligatorio
  esTerceraEdad: {
    type: Boolean,
    default: false
  }, // Indica si el usuario es de la tercera edad, se calcula automáticamente
  aplicaDescuento: {
    type: Boolean,
    default: false
  }, // Indica si el usuario aplica para un descuento, se calcula automáticamente
  saldo: {
    type: Number,
    default: 0.0
  }, // Saldo del usuario para comprar boletos, inicia en 0
  boletosDisponibles: {
    type: Number,
    default: 0
  }, // Número de boletos disponibles para el usuario, inicia en 0
  rol: {
    type: String,
    default: "pasajero"
  }, // Rol del usuario, por defecto es "pasajero"
  totpSecret: {
    type: String,
    required: false // Falso por ahora para no romper a los usuarios viejos
  },
});

module.exports = mongoose.model('Usuario', usuarioSchema);