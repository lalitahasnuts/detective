import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // Состояния для управления серверами
  const [servers, setServers] = useState([]);
  const [currentServer, setCurrentServer] = useState(null);
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState('3003'); // Установлен порт по умолчанию

  // Состояния для данных
  const [reports, setReports] = useState([]);
  const [clues, setClues] = useState([]);
  const [ipTracking, setIpTracking] = useState([]);
  const [events, setEvents] = useState([]);

  // Состояния подключений
  const [isTcpConnected, setIsTcpConnected] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Не подключено');

  // Референсы для WebSocket 
  const tcpSocket = useRef(null);
  const wsSocket = useRef(null);
  const udpSocket = useRef(null);

  // Функция отключения от сервера
  const disconnectFromServer = () => {
    [tcpSocket, wsSocket, udpSocket].forEach(socket => {
      if (socket.current) {
        socket.current.close();
      }
    });
    
    setIsTcpConnected(false);
    setIsWsConnected(false);
    setCurrentServer(null);
    setConnectionStatus('Отключено');
  };

  // обработка сообщений
  const handleMessage = (proto, event) => {
    try {
      let data;
      
      // Попытка разобрать как JSON
      try {
        data = JSON.parse(event.data);
      } catch {
        // Если не JSON, создаем объект вручную
        data = {
          type: 'raw_message',
          content: event.data,
          timestamp: new Date().toISOString()
        };
      }

      switch(proto) {
        case 'tcp':
          setReports(prev => [...prev, data].slice(-50));
          break;
        case 'clues':
          if (data.type === 'clue') {
            setClues(prev => [...prev, data].slice(-20));
          } else if (data.type === 'event') {
            setEvents(prev => [...prev, data].slice(-10));
          }
          break;
        case 'udp':
          setIpTracking(prev => [...prev, data].slice(-30));
          break;
        default:
          console.warn('Неизвестный протокол:', proto);
      }
    } catch (err) {
      console.error(`Ошибка обработки ${proto} сообщения:`, err);
    }
  };

  // Функция подключения к серверу
  const connectToServer = (server) => {
    disconnectFromServer();
    setCurrentServer(server);
    setConnectionStatus('Подключается...');

    const protocols = [
      { name: 'tcp', setConnected: setIsTcpConnected, ref: tcpSocket },
      { name: 'clues', setConnected: setIsWsConnected, ref: wsSocket },
      { name: 'udp', setConnected: null, ref: udpSocket }
    ];

    protocols.forEach(({ name, setConnected, ref }) => {
      const socket = new WebSocket(`ws://${server.ip}:${server.port}/${name}`);
      
      socket.onopen = () => {
        console.log(`${name.toUpperCase()} соединение установлено`);
        if (setConnected) setConnected(true);
        setConnectionStatus('Подключено');
      };

      socket.onmessage = (e) => handleMessage(name, e);

      socket.onerror = (err) => {
        console.error(`${name.toUpperCase()} ошибка:`, err);
        setConnectionStatus(`Ошибка: ${err.message}`);
      };

      socket.onclose = () => {
        if (setConnected) setConnected(false);
      };

      ref.current = socket;
    });
  };

  // Добавление нового сервера
  const addServer = () => {
    if (serverIp && serverPort) {
      const newServer = {
        id: Date.now(),
        ip: serverIp,
        port: parseInt(serverPort) || 3003
      };
      setServers(prev => [...prev, newServer]);
    }
  };

  // Удаление сервера
  const removeServer = (id) => {
    setServers(prev => prev.filter(s => s.id !== id));
    if (currentServer && currentServer.id === id) {
      disconnectFromServer();
    }
  };

  // Отправка отчета
  const sendReport = () => {
    if (!isTcpConnected || !tcpSocket.current) {
      alert('TCP соединение не установлено!');
      return;
    }

    const reportText = prompt('Введите текст отчета:');
    if (reportText) {
      try {
        tcpSocket.current.send(reportText);
      } catch (error) {
        console.error('Ошибка при отправке отчета:', error);
        alert('Ошибка при отправке отчета. Проверьте соединение.');
      }
    }
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      disconnectFromServer();
    };
  }, []);

  return (
    <div className="app">
      <h1>Кибер-Сыщик</h1>
      <div className="status">Статус: {connectionStatus}</div>
      
      <div className="server-management">
        <h2>Управление серверами</h2>
        <div className="server-form">
          <input 
            type="text" 
            placeholder="IP сервера (например: localhost)" 
            value={serverIp}
            onChange={(e) => setServerIp(e.target.value)}
          />
          <input 
            type="number" 
            placeholder="Порт (по умолчанию 3003)" 
            value={serverPort}
            onChange={(e) => setServerPort(e.target.value)}
          />
          <button onClick={addServer}>Добавить сервер</button>
        </div>
        
        <div className="server-list">
          <h3>Список серверов:</h3>
          {servers.length === 0 ? (
            <p>Нет добавленных серверов</p>
          ) : (
            <ul>
              {servers.map(server => (
                <li key={server.id}>
                  <span>{server.ip}:{server.port}</span>
                  <div>
                    <button 
                      onClick={() => connectToServer(server)}
                      disabled={currentServer?.id === server.id}
                    >
                      {currentServer?.id === server.id ? 'Подключен' : 'Подключиться'}
                    </button>
                    <button onClick={() => removeServer(server.id)}>Удалить</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {currentServer && (
        <div className="investigation-panel">
          <div className="panel-section">
            <h2>Отчеты (TCP) {isTcpConnected ? '✅' : '❌'}</h2>
            <button onClick={sendReport} disabled={!isTcpConnected}>
              Отправить отчет
            </button>
            <div className="data-container">
              {reports.length === 0 ? (
                <p>Нет полученных отчетов</p>
              ) : (
                <ul>
                  {reports.map((report, i) => (
                    <li key={i}>
                      <span className="timestamp">{report.timestamp}</span>
                      <span className="content">{report.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="panel-section">
            <h2>Новые улики (WebSocket) {isWsConnected ? '✅' : '❌'}</h2>
            <div className="data-container">
              {clues.length === 0 ? (
                <p>Нет новых улик</p>
              ) : (
                <ul>
                  {clues.map((clue, i) => (
                    <li key={i}>
                      <span className="timestamp">{clue.timestamp}</span>
                      <span className="content">{clue.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="panel-section">
            <h2>Отслеживание IP (UDP)</h2>
            <div className="data-container">
              {ipTracking.length === 0 ? (
                <p>Нет данных об IP-адресах</p>
              ) : (
                <ul>
                  {ipTracking.map((ip, i) => (
                    <li key={i}>
                      <span className="timestamp">{ip.timestamp}</span>
                      <span className="content">{ip.ip || ip.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="panel-section">
            <h2>События дня</h2>
            <div className="data-container">
              {events.length === 0 ? (
                <p>Нет новых событий</p>
              ) : (
                <ul>
                  {events.map((event, i) => (
                    <li key={i}>
                      <span className="timestamp">{event.timestamp}</span>
                      <span className="content">{event.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;