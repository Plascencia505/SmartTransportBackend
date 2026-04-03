# 🚌 Plataforma de Transporte - Backend API & WebSockets

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

Servidor central y API RESTful para el sistema de transporte público Offline-First. Actúa como la fuente de la verdad (Source of Truth), gestionando transacciones en tiempo real, sincronización por lotes diferidos, control de saldo y eventos bidireccionales.

## ✨ Características Principales

* **Procesamiento de Pagos Híbrido:** Soporta tanto peticiones HTTP 1:1 en tiempo real como procesamiento por lotes (Batch Processing) para sincronizaciones offline.
* **Seguridad Criptográfica Asimétrica:** Valida firmas digitales (HMAC-SHA256) generadas en los dispositivos móviles para prevenir interceptaciones o inyecciones de datos.
* **Hashing Avanzado de Contraseñas:** Implementación de Argon2, garantizando la máxima seguridad y resistencia contra ataques de fuerza bruta mediante GPU/ASIC gracias a su arquitectura de costo de memoria.
* **Prevención de Doble Gasto (Double-Spending):** Registro estricto de UUIDs consumidos para rechazar códigos QR reciclados o clonados, incluso si se envían horas después.
* **Operaciones Atómicas:** Uso del operador `$inc` de MongoDB para asegurar la consistencia del saldo en escenarios de alta concurrencia o milisegundos de diferencia.
* **Notificaciones Push (WebSockets):** Emisión de eventos de cobro a salas privadas (`Private Rooms`) para actualizar el saldo del pasajero sin necesidad de peticiones manuales.

## 🛠️ Tecnologías y Arquitectura

* **Entorno:** Node.js
* **Framework Web:** Express.js
* **Base de Datos:** MongoDB (ORM: Mongoose)
* **Comunicaciones en Tiempo Real:** Socket.io
* **Gestión de Contraseñas:** Argon2 (Ganador del *Password Hashing Competition*).
* **Criptografía Transaccional:** Módulo nativo `crypto` (Alta velocidad y bajo consumo de RAM).
* **Autenticación:** JSON Web Tokens (JWT) para sesiones sin estado (Stateless).
