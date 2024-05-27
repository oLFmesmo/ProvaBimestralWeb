import { celebrate } from './confetti.js';

let ws;

document.getElementById('connect').onclick = () => {
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onopen = () => {
    document.getElementById('messages').innerHTML += '<p>Conectado ao servidor WebSocket!</p>';
  };
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'question') {
        displayQuestion(message.data);
      } else if (message.type === 'feedback') {
        document.getElementById('messages').innerHTML += `<p>${message.message} Sua pontuação: ${message.score}</p>`;
        document.getElementById('score').textContent = `Pontuação: ${message.score}`;
        showFeedback(message.correct);
      } else if (message.type === 'end') {
        document.getElementById('messages').innerHTML += `<p>${message.message}</p>`;
        document.getElementById('questions').innerHTML = ''; // Limpa as perguntas ao final do quiz
        celebrate(); // Aciona a comemoração
      } else if (message.type === 'message') {
        document.getElementById('messages').innerHTML += `<p>${message.data}</p>`;
      }
    } catch (e) {
      document.getElementById('messages').innerHTML += `<p>${event.data}</p>`;
    }
  };
  ws.onclose = () => {
    document.getElementById('messages').innerHTML += '<p>Desconectado do servidor WebSocket</p>';
  };
};

function displayQuestion(question) {
  const questionDiv = document.getElementById('questions');
  questionDiv.innerHTML = `<p>${question.question}</p>`;
  question.choices.forEach(choice => {
    questionDiv.innerHTML += `<button class="choice-btn btn btn-secondary m-1">${choice}</button>`;
  });

  // Add event listeners to choice buttons
  document.querySelectorAll('.choice-btn').forEach(button => {
    button.onclick = () => {
      const userAnswer = button.textContent;
      ws.send(JSON.stringify({ type: 'answer', data: userAnswer }));
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
  }, 2000);
}
