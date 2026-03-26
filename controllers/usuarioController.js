const Usuario = require('../models/Usuario');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');

const registrarUsuario = async (req, res) => {
    try {
        const data = req.body;

        // Calcular edad para ver si es de la tercera edad
        const fechaNacimiento = new Date(data.fechaNacimiento);
        // Usamos getUTCFullYear para evitar desfases de zona horaria
        const edad = new Date().getUTCFullYear() - fechaNacimiento.getUTCFullYear();
        const esTerceraEdad = edad >= 60;

        // Definir si aplica descuento: es de la tercera edad o es estudiante
        const aplicaDescuento = esTerceraEdad || (data.ocupacion && data.ocupacion.toLowerCase() === 'estudiante');

        // Hashear la contraseña con Argon2
        const hashedPassword = await argon2.hash(data.password);

        // Generar la semilla TOTP desde el registro
        const totpSecret = authenticator.generateSecret(); // Ajusta esto si usas la v12 con importación directa

        // Limpiamos la curp por seguridad antes de guardarla
        const curp = data.curp.trim().toUpperCase();

        // Crear el nuevo documento de usuario
        const nuevoUsuario = new Usuario({
            ...data,
            curp: curp,
            password: hashedPassword,
            esTerceraEdad,
            aplicaDescuento,
            totpSecret,
            rol: 'pasajero' // Forzamos el rol a pasajero para evitar registros maliciosos de operadores o admins
        });

        // Guardar en mongoDB
        await nuevoUsuario.save();

        // Responder al frontend
        res.status(201).json({
            mensaje: 'Usuario registrado con éxito',
            usuario: {
                id: nuevoUsuario._id,
                nombres: nuevoUsuario.nombres,
                correo: nuevoUsuario.correo
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            error: 'Error al registrar el usuario',
            detalle: error.message
        });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { identificador, password } = req.body;

        const usuario = await Usuario.findOne({
            $or: [{ correo: identificador }, { telefono: identificador }]
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar la contraseña usando Argon2
        const passwordValida = await argon2.verify(usuario.password, password);

        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // 3. Fallback: Generar una semilla con otplib por si es un usuario viejo que no la tenía
        if (!usuario.totpSecret) {
            usuario.totpSecret = authenticator.generateSecret();
            await usuario.save();
        }

        // Gafete de token JWT con la información del usuario
        const token = jwt.sign(
            { id: usuario._id, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Enviar la respuesta al frontend con el token y la información del usuario para el dashboard
        res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token: token,
            dashboard: {
                id: usuario._id,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                rol: usuario.rol,
                saldo: usuario.saldo,
                boletosDisponibles: usuario.boletosDisponibles,
                aplicaDescuento: usuario.aplicaDescuento,
                totpSecret: usuario.totpSecret
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
    }

};

// Función para obtener el perfil básico del usuario (saldo y boletos disponibles)
const obtenerPerfilBasico = async (req, res) => {
    try {
        const { idUsuario } = req.params;

        // Buscamos al usuario, excluyendo la contraseña y datos pesados. .lean() lo hace volar.
        const usuario = await Usuario.findById(idUsuario)
            .select('saldo boletosDisponibles')
            .lean();

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    obtenerPerfilBasico
};