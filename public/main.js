let ws;

document.getElementById('connect').onclick = () => {
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onopen = () => {
    document.getElementById('messages').innerHTML += '<p>Conectado ao servidor WebSocket!</p>';
  };
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'time') {
        document.getElementById('time').textContent = `Tempo: ${message.time} segundos`;
      }
      if (message.type === 'startGameButton') {
        document.getElementById('start-game-button').style.display = 'block';
      }
      if (message.type === 'question') {
        displayQuestion(message.data);
      } else if (message.type === 'feedback') {
        document.getElementById('messages').innerHTML += `<p>${message.message} Sua pontuação: ${message.score}</p>`;
        document.getElementById('score').textContent = `Pontuação: ${message.score}`;
        showFeedback(message.correct);
      } else if (message.type === 'end') {
        document.getElementById('messages').innerHTML += `<p>${message.message}</p>`;
        document.getElementById('questions').innerHTML = ''; // Limpa as perguntas ao final do quiz
        document.getElementById('reset').disabled = false; // Habilita o botão de reinício
        console.log('Jogo terminado. Botão de reinício habilitado.');
      } else if (message.type === 'message') {
        document.getElementById('messages').innerHTML += `<p>${message.data}</p>`;
        if (message.data.includes('administrador')) {
          document.getElementById('reset-container').style.display = 'block';
        }
      }
    } catch (e) {
      document.getElementById('messages').innerHTML += `<p>${event.data}</p>`;
    }
  };
  ws.onclose = () => {
    document.getElementById('messages').innerHTML += '<p>Desconectado do servidor WebSocket</p>';
  };
};

document.getElementById('start-game-button').onclick = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('Enviando solicitação para iniciar o jogo...');
    ws.send(JSON.stringify({ type: 'startGame' }));
  }
};

let answerSubmitted = false;

function displayQuestion(question) {
  const questionDiv = document.getElementById('questions');
  questionDiv.innerHTML = `<p>${question.question}</p>`;
  question.choices.forEach(choice => {
    questionDiv.innerHTML += `<button class="choice-btn btn btn-secondary m-1">${choice}</button>`;
  });

  document.querySelectorAll('.choice-btn').forEach(button => {
    button.onclick = () => {
      if (!answerSubmitted) {
        answerSubmitted = true;
        const userAnswer = button.textContent;
        ws.send(JSON.stringify({ type: 'answer', data: userAnswer }));
        document.querySelectorAll('.choice-btn').forEach(btn => {
          btn.disabled = true;
        });
      }
    };
  });
}

function showFeedback(correct) {
  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach(button => {
    if (button.textContent === correct) {
      button.classList.add('correct');
    } else {
      button.classList.add('incorrect');
    }
  });

  setTimeout(() => {
    buttons.forEach(button => {
      button.classList.remove('correct', 'incorrect');
    });
    answerSubmitted = false;
  }, 2000);
}

document.getElementById('reset').onclick = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('Enviando solicitação de reinício...');
    ws.send(JSON.stringify({ type: 'reset' }));
    document.getElementById('reset').disabled = true;
  }
};
document.getElementById('reset-container').style.display = 'none';
