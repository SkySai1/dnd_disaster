const {
  createSession,
  joinSession,
  leaveSession,
  setRole,
  rollDice,
  logMessage,
  destroySession,
  handleDisconnect,
} = require('./sessionManager');
const { send } = require('./frames');

function routeMessage(socket, message) {
  switch (message.type) {
    case 'create_session':
      return createSession(socket, message);
    case 'join_session':
      return joinSession(socket, message);
    case 'leave_session':
      return leaveSession(socket);
    case 'set_role':
      return setRole(socket, message);
    case 'roll_dice':
      return rollDice(socket, message);
    case 'send_log':
      return logMessage(socket, message);
    case 'destroy_session':
      return destroySession(socket);
    default:
      send(socket, { type: 'error', message: 'Unknown message type' });
  }
}

module.exports = { routeMessage, handleDisconnect };
