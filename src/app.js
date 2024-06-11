require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = [];
let gameActive = false;
let admin;

const sendQuestion = (player) => {
  if (player.currentQuestionIndex < questions.length) {
    const question = questions[player.currentQuestionIndex];
    player.ws.send(JSON.stringify({ type: 'question', data: question }));
    console.log(`Enviando pergunta ${player.currentQuestionIndex + 1} para Jogador ${player.playerNumber}: ${question.question}`);
  } else {
    stopTimer(player);
    player.ws.send(JSON.stringify({ type: 'end', message: `Você completou o quiz! Sua pontuação: ${player.score}. Tempo: ${player.time.toFixed(2)} segundos.` }));
    console.log(`Jogador ${player.playerNumber} completou o quiz.`);
    checkGameEnd();
  }
};

const determineWinner = () => {
  if (players.length < 2) return;

  const sortedPlayers = players.sort((a, b) => {
    if (b.score === a.score) {
      return a.time - b.time;
    }
    return b.score - a.score;
  });
  const winner = sortedPlayers[0];

  const message = `Jogador ${winner.playerNumber} venceu com ${winner.score} pontos! Tempo: ${winner.time.toFixed(2)} segundos.`;

  players.forEach(player => {
    player.ws.send(JSON.stringify({ type: 'end', message }));
  });

  gameActive = false;
  console.log('O jogo terminou. Reinicialização agora permitida.');
};

const checkGameEnd = () => {
  const allPlayersFinished = players.every(player => player.currentQuestionIndex >= questions.length);
  if (allPlayersFinished) {
    determineWinner();
  }
};

const resetGame = () => {
  console.log('Reiniciando o jogo...');
  players.forEach(player => {
    player.score = 0;
    player.currentQuestionIndex = 0;
    player.time = 0;
  });
  gameActive = true;
  players.forEach(player => {
    sendQuestion(player);
    startTimer(player);
  });
};

const startTimer = (player) => {
  player.startTime = Date.now();
  console.log(`Timer iniciado para Jogador ${player.playerNumber}`);
};

const stopTimer = (player) => {
  const now = Date.now();
  player.time += (now - player.startTime) / 1000;
  console.log(`Timer parado para Jogador ${player.playerNumber}. Tempo total: ${player.time.toFixed(2)} segundos.`);
  sendTimeUpdate(player);
};

const sendTimeUpdate = (player) => {
  player.ws.send(JSON.stringify({ type: 'time', time: player.time.toFixed(2) }));
  console.log(`Atualização de tempo enviada para Jogador ${player.playerNumber}: ${player.time.toFixed(2)} segundos`);
};

wss.on('connection', (ws) => {
  console.log('Nova conexão WebSocket');
  if (players.length < 10) {
    const isAdmin = players.length === 0;
    const player = { ws, score: 0, isAdmin, playerNumber: players.length + 1, currentQuestionIndex: 0, time: 0, startTime: 0 };
    players.push(player);

    ws.send(JSON.stringify({ type: 'message', data: `Bem-vindo ao servidor WebSocket! Você é o jogador ${player.playerNumber}.` }));
    console.log(`Jogador ${player.playerNumber} conectado. Admin: ${isAdmin}`);

    if (isAdmin) {
      admin = player;
      ws.send(JSON.stringify({ type: 'message', data: 'Você é o administrador. Você pode iniciar o jogo.' }));
      if (!gameActive && players.length > 1) {
        ws.send(JSON.stringify({ type: 'startGameButton' }));
      }
    } else {
      if (gameActive) {
        ws.send(JSON.stringify({ type: 'message', data: 'O jogo já está em andamento. Por favor, aguarde a próxima partida.' }));
      }
    }
  } else {
    ws.send(JSON.stringify({ type: 'message', data: 'O limite de jogadores foi atingido. Não é possível entrar mais jogadores.' }));
    console.log('Conexão recusada. Limite de jogadores atingido.');
  }

  ws.on('message', (message) => {
    const receivedMessage = JSON.parse(message);
    console.log(`Mensagem recebida de Jogador ${players.find(p => p.ws === ws)?.playerNumber || 'desconhecido'}:`, receivedMessage);
    const player = players.find(p => p.ws === ws);

    if (receivedMessage.type === 'answer' && gameActive) {
      const userAnswer = receivedMessage.data;
      const currentQuestion = questions[player.currentQuestionIndex];
      const correctAnswer = currentQuestion.answer;

      if (userAnswer === correctAnswer) {
        player.score += 1;
        player.ws.send(JSON.stringify({
          type: 'feedback',
          message: 'Resposta correta!',
          correct: correctAnswer,
          score: player.score
        }));
        console.log(`Jogador ${player.playerNumber} respondeu corretamente. Pontuação: ${player.score}`);
      } else {
        player.ws.send(JSON.stringify({
          type: 'feedback',
          message: 'Resposta incorreta.',
          correct: correctAnswer,
          score: player.score
        }));
        console.log(`Jogador ${player.playerNumber} respondeu incorretamente. Pontuação: ${player.score}`);
      }

      player.currentQuestionIndex += 1;
      stopTimer(player);
      sendQuestion(player);
      startTimer(player);

    } else if (receivedMessage.type === 'reset' && player.isAdmin && !gameActive) {
      console.log('Solicitação de reinício recebida do administrador.');
      resetGame();
    } else if (receivedMessage.type === 'reset' && !player.isAdmin) {
      console.log('Jogador não autorizado tentou reiniciar o jogo.');
    } else if (receivedMessage.type === 'reset' && gameActive) {
      console.log('Reinicialização solicitada enquanto o jogo ainda está ativo.');
    } else if (receivedMessage.type === 'startGame' && player.isAdmin && !gameActive && players.length > 1) {
      console.log('Iniciando o jogo...');
      resetGame();
    }
  });

  ws.on('close', () => {
    players = players.filter(p => p.ws !== ws);
    console.log('Um jogador foi desconectado');
  });
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.render('index');
});

server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
