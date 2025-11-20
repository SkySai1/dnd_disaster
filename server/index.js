const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { setupSocket } = require('./websocketServer');

const configPath = path.join(__dirname, '..', 'config', 'ws-config.json');

function loadWsConfig() {
  try {
    const file = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(file);
  } catch (err) {
    console.warn('Unable to read ws-config.json, falling back to defaults:', err);
    return {};
  }
}

const rawConfig = loadWsConfig();
const HOST = process.env.WS_HOST || rawConfig.host || '0.0.0.0';
const PORT = Number(process.env.PORT || rawConfig.port || 3000);
const PUBLIC_WS_URL =
  process.env.PUBLIC_WS_URL || rawConfig.publicWsUrl || `ws://${HOST}:${PORT}`;

const sharedConfigBody = JSON.stringify({
  wsUrl: PUBLIC_WS_URL,
  host: HOST,
  port: PORT,
});

function handleHttpRequest(req, res) {
  if (req.method === 'GET' && req.url === '/config/ws-config.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(sharedConfigBody);
    return;
  }
  res.statusCode = 404;
  res.end();
}

function createWebSocketAccept(key) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto.createHash('sha1').update(key + GUID).digest('base64');
}

const server = http.createServer(handleHttpRequest);

server.on('upgrade', (req, socket) => {
  const upgradeHeader = req.headers['upgrade'];
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  const secWebSocketKey = req.headers['sec-websocket-key'];
  if (!secWebSocketKey) {
    socket.destroy();
    return;
  }

  const acceptKey = createWebSocketAccept(secWebSocketKey);
  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
  ];

  socket.write(responseHeaders.concat('\r\n').join('\r\n'));
  setupSocket(socket);
});

server.listen(PORT, HOST, () => {
  console.log(`WebSocket server running on ${HOST}:${PORT} (public ${PUBLIC_WS_URL})`);
});
