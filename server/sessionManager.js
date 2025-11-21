/**
 * SessionManager: maintains in-memory sessions, player membership, admin assignment,
 * lifecycle cleanup, and message fan-out events. Sessions live in the exported
 * `sessions` Map from `state.js` and use raw sockets stored in `socketLookup` for
 * cleanup when disconnects occur.
 */
const { sessions, socketLookup, generateId } = require('./state');
const { broadcast, send } = require('./frames');

const DEFAULT_ROLE = 'Guest';

function sanitizePlayers(session) {
  return session.players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    role: player.role,
  }));
}

function sessionSnapshot(session, playerId) {
  return {
    type: 'session_joined',
    sessionId: session.sessionId,
    playerId,
    adminId: session.adminId,
    players: sanitizePlayers(session),
    log: session.log,
    roles: session.roles,
    diceWindowOpen: session.diceWindowOpen,
    diceRoundId: session.diceRoundId,
    diceResults: session.diceResults,
  };
}

function addLog(sessionId, authorId, message, kind = 'user', authorNameOverride) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const player = session.players.find((p) => p.playerId === authorId);
  const entry = {
    id: generateId(8),
    timestamp: Date.now(),
    authorId,
    authorName: authorNameOverride || player?.name || 'System',
    message,
    kind,
  };

  session.log.push(entry);
  broadcast(session, { type: 'log_event', entry });
}

function ensureAdmin(session) {
  if (!session.adminId && session.players.length > 0) {
    session.adminId = session.players[0].playerId;
  }
}

function emitPlayersUpdate(session) {
  broadcast(session, {
    type: 'players_update',
    players: sanitizePlayers(session),
    adminId: session.adminId,
  });
}

function broadcastRoles(session) {
  broadcast(session, { type: 'roles_update', roles: session.roles });
}

function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  return role.trim();
}

function buildRoleList(inputRoles = []) {
  const normalized = inputRoles
    .map(normalizeRole)
    .filter((role) => role.length > 0);

  const deduped = [];
  const seen = new Set();
  normalized.forEach((role) => {
    const key = role.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(role);
    }
  });

  if (!seen.has(DEFAULT_ROLE.toLowerCase())) {
    deduped.unshift(DEFAULT_ROLE);
  }

  return deduped;
}

function createSession(socket, payload) {
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
    roles: [DEFAULT_ROLE],
    diceWindowOpen: false,
    diceRoundId: 0,
    diceResults: {},
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

  send(socket, sessionSnapshot(session, playerId));
  emitPlayersUpdate(session);
  addLog(sessionId, playerId, 'created the session', 'system');
}

function joinSession(socket, payload) {
  const { name, sessionId } = payload || {};

  if (!name || !sessionId) {
    send(socket, { type: 'error', message: 'Name and sessionId are required' });
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    send(socket, { type: 'error', message: 'Session not found' });
    return;
  }

  const playerId = generateId(6);
  const player = { playerId, name, role: null, connection: socket };
  session.players.push(player);
  ensureAdmin(session);
  socketLookup.set(socket, { sessionId, playerId });

  send(socket, sessionSnapshot(session, playerId));
  emitPlayersUpdate(session);
  addLog(sessionId, playerId, 'joined the session', 'system');
}

function leaveSession(socket) {
  handleDisconnect(socket, true);
  send(socket, { type: 'left_session' });
}

function setRole(socket, payload) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;

  const player = session.players.find((p) => p.playerId === playerId);
  if (!player) return;

  const requestedRole = normalizeRole(payload.role);
  if (requestedRole && !session.roles.includes(requestedRole)) {
    send(socket, { type: 'error', message: 'Эта роль недоступна в сессии' });
    return;
  }

  const takenBy = session.players.find(
    (p) => p.role === requestedRole && p.playerId !== playerId
  );

  if (takenBy) {
    send(socket, { type: 'error', message: 'Роль уже занята другим игроком' });
    return;
  }

  player.role = requestedRole || null;
  broadcast(session, { type: 'role_update', playerId, role: player.role });
  emitPlayersUpdate(session);
  addLog(sessionId, playerId, `updated role to ${player.role || 'none'}`);
}

function parseDice(dice) {
  if (typeof dice !== 'string') return null;
  const match = /^d(\d+)$/i.exec(dice);
  if (!match) return null;
  const sides = Number(match[1]);
  if (!Number.isFinite(sides) || sides <= 0) return null;
  return sides;
}

function openDiceWindow(socket) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;

  if (session.adminId !== playerId) {
    send(socket, { type: 'error', message: 'Only admin can open dice window' });
    return;
  }

  session.diceWindowOpen = true;
  session.diceRoundId += 1;
  session.diceResults = {};

  broadcast(session, {
    type: 'dice_window_state',
    open: true,
    roundId: session.diceRoundId,
  });
}

function closeDiceWindow(socket) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;

  if (session.adminId !== playerId) {
    send(socket, { type: 'error', message: 'Only admin can close dice window' });
    return;
  }

  session.diceWindowOpen = false;
  broadcast(session, {
    type: 'dice_window_state',
    open: false,
    roundId: session.diceRoundId,
  });
}

function rollDice(socket, payload) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;

  if (!session.diceWindowOpen) {
    send(socket, { type: 'error', message: 'Dice window is closed' });
    return;
  }

  const sides = parseDice(payload.dice);
  if (!sides) {
    send(socket, { type: 'error', message: 'Invalid dice format' });
    return;
  }

  const previous = session.diceResults[playerId];
  if (previous && previous.roundId === session.diceRoundId) {
    send(socket, { type: 'error', message: 'Already rolled in this round' });
    return;
  }
  const value = Math.floor(Math.random() * sides) + 1;
  const event = {
    type: 'dice_roll',
    playerId,
    dice: payload.dice,
    value,
    roundId: session.diceRoundId,
  };
  session.diceResults[playerId] = { roundId: session.diceRoundId, value };
  broadcast(session, event);
  addLog(sessionId, playerId, `rolled ${payload.dice} and got ${value}`, 'dice');
}

function logMessage(socket, payload) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  addLog(sessionId, playerId, payload.message || '', 'user');
}

function updateRoles(socket, payload) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  if (!session) return;

  if (session.adminId !== playerId) {
    send(socket, { type: 'error', message: 'Only admin can update roles' });
    return;
  }

  const roles = buildRoleList(Array.isArray(payload.roles) ? payload.roles : []);
  session.roles = roles;

  session.players.forEach((player) => {
    if (player.role && !roles.includes(player.role)) {
      player.role = null;
      broadcast(session, { type: 'role_update', playerId: player.playerId, role: null });
    }
  });

  broadcastRoles(session);
  emitPlayersUpdate(session);
  addLog(sessionId, playerId, 'обновил список ролей');
}

function destroySession(socket) {
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

function handleDisconnect(socket, intentional = false) {
  const info = socketLookup.get(socket);
  if (!info) return;
  const { sessionId, playerId } = info;
  const session = sessions.get(sessionId);
  socketLookup.delete(socket);
  if (!session) return;

  const idx = session.players.findIndex((p) => p.playerId === playerId);
  const playerName = idx !== -1 ? session.players[idx].name : undefined;
  if (idx !== -1) {
    session.players.splice(idx, 1);
  }

  if (session.adminId === playerId) {
    session.adminId = null;
    ensureAdmin(session);
  }

  if (!intentional) {
    addLog(sessionId, playerId, 'disconnected', 'system', playerName);
  } else {
    addLog(sessionId, playerId, 'left the session', 'system', playerName);
  }

  emitPlayersUpdate(session);

  if (session.players.length === 0) {
    sessions.delete(sessionId);
  }
}

module.exports = {
  createSession,
  joinSession,
  leaveSession,
  setRole,
  rollDice,
  logMessage,
  updateRoles,
  destroySession,
  handleDisconnect,
  openDiceWindow,
  closeDiceWindow,
};
