const http = require('http');
const crypto = require('crypto');
const { setupSocket } = require('./websocketServer');

function buildRuntimeConfig() {
  const host = process.env.WS_HOST || process.env.HOST || '0.0.0.0';
  const port = Number(process.env.WS_PORT || process.env.PORT || 3000);
  const publicWsUrl =
    process.env.PUBLIC_WS_URL || process.env.WS_PUBLIC_URL || `ws://${host}:${port}`;

  return {
    wsUrl: publicWsUrl,
    host,
    port,
  };
}

function handleHttpRequest(req, res) {
  if (req.method === 'GET' && req.url === '/config/ws-config.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(buildRuntimeConfig()));
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

const runtimeConfig = buildRuntimeConfig();
server.listen(runtimeConfig.port, runtimeConfig.host, () => {
  console.log(
    `WebSocket server running on ${runtimeConfig.host}:${runtimeConfig.port} (public ${runtimeConfig.wsUrl})`
  );
});
