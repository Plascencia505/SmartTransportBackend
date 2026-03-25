const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require('../controllers/usuarioController');
const { obtenerHistorialUnificado } = require('../controllers/historialController');
const verificarToken  = require('../middleware/authMiddleware');
const reglasValidacionRegistro = require('../middleware/validarRegistro');

// Ruta: POST http://localhost:3000/api/usuarios/registro
// Validar los datos de registro antes de llegar al controlador
router.post('/registro', reglasValidacionRegistro, registrarUsuario);

// Ruta: POST http://localhost:3000/api/usuarios/login
router.post('/login', loginUsuario);

// Ruta: GET http://localhost:3000/api/usuarios/:idUsuario/historial
router.get('/:idUsuario/historial', verificarToken, obtenerHistorialUnificado);

module.exports = router;