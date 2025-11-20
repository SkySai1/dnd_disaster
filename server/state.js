const crypto = require('crypto');

/**
 * Global in-memory session registry.
 * Map<sessionId, Session>
 */
const sessions = new Map();

/**
 * Lookup table from raw sockets to their session/player ids for cleanup.
 * Map<socket, { sessionId: string, playerId: string }>
 */
const socketLookup = new Map();

function generateId(bytes = 3) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  sessions,
  socketLookup,
  generateId,
};
