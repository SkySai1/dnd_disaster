const { decodeFrame, send } = require('./frames');
const { routeMessage, handleDisconnect } = require('./router');

function setupSocket(socket) {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length > 0) {
      const frame = decodeFrame(buffer);
      if (!frame) break;
      buffer = frame.remaining;

      if (frame.opcode === 0x8) {
        socket.end();
        break;
      }
      if (frame.opcode !== 0x1) {
        continue; // Ignore non-text frames
      }
      try {
        const data = JSON.parse(frame.payload.toString());
        routeMessage(socket, data);
      } catch (err) {
        send(socket, { type: 'error', message: 'Invalid JSON payload' });
      }
    }
  });

  socket.on('end', () => handleDisconnect(socket));
  socket.on('error', () => handleDisconnect(socket));
}

module.exports = { setupSocket };
