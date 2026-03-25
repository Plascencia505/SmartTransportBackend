const { body, validationResult } = require('express-validator');

const reglasValidacionRegistro = [
    // Reglas de validación para cada campo del formulario de registro
    body('nombres').notEmpty().withMessage('Los nombres son obligatorios.'),
    body('apellidos').notEmpty().withMessage('Los apellidos son obligatorios.'),
    body('correo').isEmail().withMessage('Debe ser un correo electrónico válido.'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
    body('telefono').isLength({ min: 10, max: 10}).withMessage('El teléfono debe tener al menos 10 dígitos.'),
    body('fechaNacimiento').isISO8601().withMessage('La fecha de nacimiento debe tener un formato válido (YYYY-MM-DD).'),
    body('curp')
        .isLength({ min: 18, max: 18 }).withMessage('La CURP debe tener exactamente 18 caracteres.')
        .custom((curp, { req }) => {
            const fecha = req.body.fechaNacimiento;

            // Si no enviaron fecha o curp incompleta, dejamos que los validadores de arriba hagan su trabajo
            if (!fecha || !curp || curp.length < 10) return true;

            const partes = fecha.split('-');
            if (partes.length !== 3) return true; // El isISO8601 ya lo va a rebotar

            // Extraemos YYMMDD de la fecha ingresada
            const yearStr = partes[0].substring(2, 4);
            const monthStr = partes[1];
            const dayStr = partes[2];
            const fechaEsperada = `${yearStr}${monthStr}${dayStr}`;

            // Extraemos YYMMDD de la CURP
            const fechaEnCurp = curp.substring(4, 10).toUpperCase();

            if (fechaEsperada !== fechaEnCurp) {
                // Lanzamos el error genérico que le llegará al arreglo de 'detalles'
                throw new Error('Los datos de identidad no coinciden. Verifica tu información.');
            }

            return true; // Si todo cuadra, pasa la prueba
        }),

    body('ocupacion').isIn(['general', 'estudiante']).withMessage('La ocupación no es válida.'),
    body('rol').
        optional().
        equals('pasajero').withMessage('Desde este portal solo se pueden registrar pasajeros.'),

    // Revisión final de errores después de aplicar las reglas anteriores
    (req, res, next) => {
        const errores = validationResult(req);

        // Si hay errores, rebotamos la petición antes de que toque tu controlador
        if (!errores.isEmpty()) {
            return res.status(400).json({
                error: 'Datos de registro inválidos',
                detalles: errores.array() // Le mandamos al atacante la lista de todo lo que hizo mal
            });
        }
        next();
    }
];

module.exports = reglasValidacionRegistro;