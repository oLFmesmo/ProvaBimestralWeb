require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Configura o EJS como mecanismo de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Carrega as perguntas do arquivo JSON
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8'));

// Cria um servidor HTTP
const server = http.createServer(app);

// Cria uma instância do WebSocket Server
const wss = new WebSocket.Server({ server });

let players = [];
let currentQuestionIndex = 0;

// Função para enviar a próxima pergunta
const sendQuestion = () => {
  if (currentQuestionIndex < questions.length) {
    const question = questions[currentQuestionIndex];
    players.forEach(player => {
      player.ws.send(JSON.stringify({ type: 'question', data: question }));
    });
  } else {
    determineWinner();
  }
};

// Função para determinar o vencedor
const determineWinner = () => {
  if (players.length < 2) return;

  const [player1, player2] = players;
  let message;

  if (player1.score > player2.score) {
    message = `Jogador 1 venceu com ${player1.score} pontos!`;
  } else if (player2.score > player1.score) {
    message = `Jogador 2 venceu com ${player2.score} pontos!`;
  } else {
    message = `Empate! Ambos os jogadores terminaram com ${player1.score} pontos.`;
  }

  players.forEach(player => {
    player.ws.send(JSON.stringify({ type: 'end', message }));
  });
};

// Configura o WebSocket Server para aceitar conexões de clientes
wss.on('connection', (ws) => {
  if (players.length < 2) {
    const player = { ws, score: 0 };
    players.push(player);
    ws.send(JSON.stringify({ type: 'message', data: `Bem-vindo ao servidor WebSocket! Você é o jogador ${players.length}.` }));
    console.log(`Jogador ${players.length} conectado`);

    if (players.length === 2) {
      currentQuestionIndex = 0;
      sendQuestion();
    }
  } else {
    ws.send(JSON.stringify({ type: 'message', data: 'O jogo já está em andamento. Por favor, aguarde a próxima partida.' }));
  }

  ws.on('message', (message) => {
    const receivedMessage = JSON.parse(message);
    if (receivedMessage.type === 'answer') {
      const userAnswer = receivedMessage.data;
      const currentQuestion = questions[currentQuestionIndex];

      const player = players.find(p => p.ws === ws);
      let correctAnswer = currentQuestion.answer;
      if (userAnswer === correctAnswer) {
        player.score += 1;
      }

      player.ws.send(JSON.stringify({
        type: 'feedback',
        message: userAnswer === correctAnswer ? 'Resposta correta!' : 'Resposta incorreta.',
        correct: correctAnswer,
        score: player.score
      }));

      if (players.every(p => p.ws.readyState === WebSocket.OPEN)) {
        currentQuestionIndex += 1;
        sendQuestion();
      }
    }
  });

  ws.on('close', () => {
    players = players.filter(p => p.ws !== ws);
    console.log('Um jogador foi desconectado');
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
