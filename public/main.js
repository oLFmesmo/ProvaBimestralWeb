let ws;
document.getElementById('connect').onclick = () => {
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onopen = () => {
    document.getElementById('messages').innerHTML += '<p>Tome ta conectaco com sucesso</p>';
  };
  ws.onmessage = (event) => {
    document.getElementById('messages').innerHTML += `<p>Enviado: ${event.data}</p>`;
  };
  ws.onclose = () => {
    document.getElementById('messages').innerHTML += '<p>Desconectado se acabou ai</p>';
  };
};

document.getElementById('send').onclick = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send('Ta tudo certo aqui');
  }
};
