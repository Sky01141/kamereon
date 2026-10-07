// Entry point. Server is authoritative: never trust client state.
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { attachGameServer } = require('./server/gameServer');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ status: 'ok' })); // Render health check

attachGameServer(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server listening on :${PORT}`));
