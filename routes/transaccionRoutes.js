const express = require('express');
const router = express.Router();

//Importamos el middleware de seguridad (Los Gafetes VIP)
const verificarToken = require('../middleware/authMiddleware');

//Importamos las funciones desde sus 3 controladores independientes
const { registrarViaje, sincronizarLote} = require('../controllers/viajeController');
const { recargarSaldo } = require('../controllers/recargaController');
const { comprarBoletos } = require('../controllers/compraBoletoController');

//Rutas de transacciones
// Por el momento iguales para no afectar frontend
router.post('/utilizar', verificarToken, registrarViaje);
router.post('/recargar', verificarToken, recargarSaldo);
router.post('/comprar', verificarToken, comprarBoletos);
router.post('/sincronizar-lote', verificarToken, sincronizarLote);

module.exports = router;