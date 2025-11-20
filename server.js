const http = require('http');
const crypto = require('crypto');

/**
 * In-memory storage for all active sessions.
 * Map<sessionId, Session>
 */
const sessions = new Map();

/**
 * Track which session/player belongs to a socket for cleanup purposes.
 * Map<socket, { sessionId: string, playerId: string }>
 */
const socketLookup = new Map();

function generateId(bytes = 3) {
  return crypto.randomBytes(bytes).toString('hex');
}

function createWebSocketAccept(key) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto.createHash('sha1').update(key + GUID).digest('base64');
}

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

function broadcast(sessionId, payload) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.players.forEach((player) => {
    send(player.connection, payload);
  });
}

function addLog(sessionId, author, message) {
  const session = sessions.get(sessionId);
  if (!session) return;
  const entry = {
    type: 'log_event',
    timestamp: Date.now(),
    author,
    message,
  };
  session.log.push(entry);
  broadcast(sessionId, entry);
}

function sanitizePlayers(session) {
  return session.players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    role: player.role,
  }));
}

function emitPlayersUpdate(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  broadcast(sessionId, {
    type: 'players_update',
    players: sanitizePlayers(session),
    adminId: session.adminId,
  });
}

function assignAdminIfNeeded(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (!session.adminId && session.players.length > 0) {
    session.adminId = session.players[0].playerId;
  }
}

function handleDisconnect(socket) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) {
    socketLookup.delete(socket);
    return;
  }

  const idx = session.players.findIndex((p) => p.playerId === playerId);
  if (idx !== -1) {
    session.players.splice(idx, 1);
  }

  if (session.adminId === playerId) {
    session.adminId = null;
    assignAdminIfNeeded(sessionId);
  }

  addLog(sessionId, playerId, 'left the session');
  emitPlayersUpdate(sessionId);

  if (session.players.length === 0) {
    sessions.delete(sessionId);
  }
  socketLookup.delete(socket);
}

function handleCreateSession(socket, payload) {
  const { name } = payload || {};
  if (!name) {
    send(socket, { type: 'error', message: 'Name is required to create a session' });
    return;
  }
  const sessionId = generateId(3);
  const playerId = generateId(6);
  const session = {
    sessionId,
    players: [],
    adminId: playerId,
    log: [],
    roles: [],
  };

  const player = {
    playerId,
    name,
    role: null,
    connection: socket,
  };

  session.players.push(player);
  sessions.set(sessionId, session);
  socketLookup.set(socket, { sessionId, playerId });
  send(socket, { type: 'session_created', sessionId, playerId });
  emitPlayersUpdate(sessionId);
  addLog(sessionId, playerId, 'created the session');
}

function handleJoinSession(socket, payload) {
  const { name, sessionId } = payload || {};
  if (!name || !sessionId) {
    send(socket, { type: 'error', message: 'Name and sessionId are required to join' });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    send(socket, { type: 'error', message: 'Session not found' });
    return;
  }

  const playerId = generateId(6);
  const player = {
    playerId,
    name,
    role: null,
    connection: socket,
  };

  session.players.push(player);
  if (!session.adminId) {
    session.adminId = playerId;
  }
  socketLookup.set(socket, { sessionId, playerId });
  send(socket, { type: 'session_joined', sessionId, playerId, adminId: session.adminId });
  emitPlayersUpdate(sessionId);
  addLog(sessionId, playerId, 'joined the session');
}

function handleLeaveSession(socket) {
  handleDisconnect(socket);
  send(socket, { type: 'left_session' });
}

function handleRoleUpdate(socket, payload) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;
  const player = session.players.find((p) => p.playerId === playerId);
  if (!player) return;

  player.role = payload.role || null;
  broadcast(sessionId, { type: 'role_update', playerId, role: player.role });
  emitPlayersUpdate(sessionId);
  addLog(sessionId, playerId, `updated role to ${player.role || 'none'}`);
}

function parseDice(dice) {
  if (typeof dice !== 'string') return null;
  const match = /^d(\d+)$/.exec(dice.toLowerCase());
  if (!match) return null;
  const sides = Number(match[1]);
  if (!Number.isFinite(sides) || sides <= 0) return null;
  return sides;
}

function handleDiceRoll(socket, payload) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;
  const sides = parseDice(payload.dice);
  if (!sides) {
    send(socket, { type: 'error', message: 'Invalid dice format' });
    return;
  }
  const value = Math.floor(Math.random() * sides) + 1;
  const event = { type: 'dice_roll', playerId, dice: payload.dice, value };
  broadcast(sessionId, event);
  addLog(sessionId, playerId, `rolled ${payload.dice} and got ${value}`);
}

function handleLogMessage(socket, payload) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  addLog(sessionId, playerId, payload.message || '');
}

function handleDestroySession(socket) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;
  if (session.adminId !== playerId) {
    send(socket, { type: 'error', message: 'Only admin can destroy session' });
    return;
  }

  session.players.forEach((player) => {
    send(player.connection, { type: 'session_destroyed', sessionId });
    socketLookup.delete(player.connection);
    player.connection.destroy();
  });
  sessions.delete(sessionId);
}

function routeMessage(socket, message) {
  switch (message.type) {
    case 'create_session':
      return handleCreateSession(socket, message);
    case 'join_session':
      return handleJoinSession(socket, message);
    case 'leave_session':
      return handleLeaveSession(socket);
    case 'set_role':
      return handleRoleUpdate(socket, message);
    case 'roll_dice':
      return handleDiceRoll(socket, message);
    case 'log_message':
      return handleLogMessage(socket, message);
    case 'destroy_session':
      return handleDestroySession(socket);
    default:
      send(socket, { type: 'error', message: 'Unknown message type' });
  }
}

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

