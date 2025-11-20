const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { setupSocket } = require('./websocketServer');

const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
const indexHtmlPath = path.join(clientDistDir, 'index.html');

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

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function serveFile(res, filePath) {
  const contentType = getContentType(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function isPathInside(base, target) {
  const relative = path.relative(base, target);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

function handleHttpRequest(req, res) {
  const urlPath = decodeURI(req.url.split('?')[0]);

  if (req.method === 'GET' && urlPath === '/config/ws-config.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(buildRuntimeConfig()));
    return;
  }

  // Serve static assets for the built web client
  const sanitized = path.normalize(urlPath).replace(/^\//, '');
  const requestedPath = path.join(clientDistDir, sanitized || 'index.html');
  const resolvedPath = fs.existsSync(requestedPath) && fs.statSync(requestedPath).isDirectory()
    ? path.join(requestedPath, 'index.html')
    : requestedPath;

  if (isPathInside(clientDistDir, resolvedPath) && fs.existsSync(resolvedPath)) {
    serveFile(res, resolvedPath);
    return;
  }

  // SPA fallback to index.html when assets are missing
  if (fs.existsSync(indexHtmlPath)) {
    serveFile(res, indexHtmlPath);
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
