require('dotenv').config(); // Carga las variables del .env
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

// Inicializar la app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`Cliente conectado al Socket: ${socket.id}`);

    // El frontend emitirá este evento en cuanto el usuario inicie sesión
    socket.on('unirse_canal', (idUsuario) => {
        socket.join(idUsuario); // El socket se une a un canal privado con el nombre del ID del usuario
        console.log(`Usuario [${idUsuario}] se ha unido a su canal privado.`);
    });

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});
conectarDB();

// Middlewares
app.use(cors()); // Permite peticiones desde tu app en Flutter
app.use(express.json()); // Permite leer los JSON que mandes en el body

// Rutas al resto de módulos
app.use('/api/usuarios', require('./routes/usuarioRoutes'));
app.use('/api/transacciones', require('./routes/transaccionRoutes'));

// Ruta de prueba para verificar que el servidor vive
app.get('/', (req, res) => {
    res.send('Servidor de transporte inteligente andando');
});

// Levantar el servidor
const PORT = process.env.PORT || 3000;
const IP = 'localhost';
server.listen(PORT, IP, () => {
    console.log(`Servidor corriendo en http://${IP}:${PORT}`);
});