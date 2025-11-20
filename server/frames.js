function encodeFrame(data) {
  const payload = Buffer.from(data);
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function decodeFrame(buffer) {
  if (buffer.length < 2) return null;

  const firstByte = buffer[0];
  const secondByte = buffer[1];

  const isFinal = (firstByte & 0x80) !== 0;
  const opcode = firstByte & 0x0f;
  const isMasked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  let maskingKey;
  if (isMasked) {
    if (buffer.length < offset + 4) return null;
    maskingKey = buffer.slice(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLength) return null;
  let payload = buffer.slice(offset, offset + payloadLength);
  const remaining = buffer.slice(offset + payloadLength);

  if (isMasked) {
    payload = payload.map((byte, index) => byte ^ maskingKey[index % 4]);
  }

  return {
    isFinal,
    opcode,
    payload,
    remaining,
  };
}

function send(socket, message) {
  const data = typeof message === 'string' ? message : JSON.stringify(message);
  try {
    socket.write(encodeFrame(data));
  } catch (err) {
    console.error('Failed to send message', err);
  }
}

// Broadcasts a payload to every player connection in the session.
function broadcast(session, payload) {
  if (!session) return;
  session.players.forEach((player) => {
    send(player.connection, payload);
  });
}

module.exports = {
  encodeFrame,
  decodeFrame,
  send,
  broadcast,
};
