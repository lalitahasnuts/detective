const { WebSocketServer } = require('ws');
const express = require('express');
const path = require('path');

const PORT = 3003;
const app = express();

// Middleware для статических файлов 
app.use(express.static(path.join(__dirname, '../client/build')));

// Создаём HTTP-сервер
const server = app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

// Создаём WebSocket-сервер
const wss = new WebSocketServer({ server });

// Обработка WebSocket-соединений
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  console.log(`Новое подключение: ${pathname}`);

  // Обработка разных эндпоинтов
  if (pathname === '/tcp') {
    // В обработчике TCP сообщений:
    ws.on('message', (message) => {
      console.log('Получен TCP отчёт:', message.toString());
      ws.send(JSON.stringify({
        type: 'tcp_report',
        content: message.toString(),
        timestamp: new Date().toISOString()
      }));
    });
  } 
  else if (pathname === '/clues') {
    // Генерация улик каждые 30 секунд
    const interval = setInterval(() => {
      const clues = [
        "Обнаружен подозрительный процесс",
        "Найдены скрытые файлы",
        "Зафиксирована попытка взлома",
        "Обнаружен новый вредоносный IP"
      ];
      const clue = {
        type: 'clue',
        content: clues[Math.floor(Math.random() * clues.length)],
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(clue));
    }, 30000);

    ws.on('close', () => clearInterval(interval));
  }
  else if (pathname === '/udp') {
    // Имитация UDP-трафика
    const interval = setInterval(() => {
      const ip = `${rand(1,255)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`;
      ws.send(JSON.stringify({
        type: 'ip_tracking',
        ip: ip,
        timestamp: new Date().toISOString()
      }));
    }, 15000);

    ws.on('close', () => clearInterval(interval));
  }

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}