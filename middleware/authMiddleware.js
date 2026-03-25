const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // Buscamos el token en la cabecera (header) de la petición que manda Flutter
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se envió un token.' });
    }

    try {
        // Normalmente el token llega como "Bearer eyJhbGciOi...", así que le quitamos la palabra "Bearer "
        const tokenLimpio = token.replace('Bearer ', '');

        // Verificamos que sea válido y no esté falsificado usando tu llave secreta del .env
        const verificado = jwt.verify(tokenLimpio, process.env.JWT_SECRET);

        // Si todo está bien, guardamos los datos del usuario en la petición y lo dejamos pasar
        req.usuario = verificado;
        next();
    } catch (error) {
        res.status(400).json({ error: 'El token no es válido o ya expiró.' });
    }
};

module.exports = verificarToken;