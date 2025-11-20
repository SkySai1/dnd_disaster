const http = require('http');
const crypto = require('crypto');
const { setupSocket } = require('./websocketServer');

function createWebSocketAccept(key) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto.createHash('sha1').update(key + GUID).digest('base64');
}

const server = http.createServer();

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
