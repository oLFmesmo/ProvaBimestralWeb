require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');


const app = express();
const port = process.env.PORT || 3000;

// Configura o EJS como mecanismo de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Cria um servidor HTTP
const server = http.createServer(app);

// Cria uma instância do WebSocket Server
const wss = new WebSocket.Server({ server });

// Configura o WebSocket Server para aceitar conexões de clientes
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(`Recebeu: ${message}`);
    ws.send(`Mandou pro servidor: ${message}`);
  });

  ws.on('close', () => {
    console.log('Foi desconectado');
  });
});

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rota inicial
app.get('/', (req, res) => {
  res.render('index');
});

// Inicia o servidor HTTP e WebSocket
server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
