# dnd_disaster

Minimal WebSocket server for managing lightweight D&D disaster game sessions. Sessions are kept purely in memory.

This repository now also includes a lightweight React client for joining sessions and picking roles.

## Running

```bash
npm install # no external dependencies required
npm start
```

The server listens on `PORT` (default `3000`).

> ⚠️ The client tooling requires Node.js 18 or newer. Both x86_64 and arm64 builds are available from [nodejs.org](https://nodejs.org) or via a version manager such as `nvm`.

### Client (Stage 2 prototype)

```
npm run client:install
npm run dev # Vite dev server at http://localhost:5173 (runs from ./client)
```

Set `VITE_WS_URL` if the WebSocket server is not available on `ws://localhost:3000`.

## Protocol overview

All communication occurs over WebSocket text frames containing JSON objects.

### Client → Server
- `create_session` `{ name }`: Create a new session and join as the first player/admin. Response: `session_joined` snapshot.
- `join_session` `{ name, sessionId }`: Join an existing session. Response: `session_joined` snapshot.
- `leave_session`: Voluntarily leave the session.
- `set_role` `{ role }`: Update the caller's role.
- `roll_dice` `{ dice: "d20" }`: Server rolls the dice and broadcasts the result.
- `send_log` `{ message }`: Append a message to the shared log.
- `destroy_session`: Admin-only; closes the session and disconnects players.

### Server → Client
- `session_joined`: Snapshot containing `sessionId`, `playerId`, `adminId`, `players`, `log`, and `roles` when you join/create.
- `players_update`: Emitted whenever players join/leave/change roles; includes `players` and `adminId`.
- `role_update`: Announces a single player's role change.
- `dice_roll`: Broadcast result of a server-side roll.
- `log_event`: Timestamped log entry appended by any player or server actions.
- `session_destroyed`: Sent when the admin closes a session.
- `error`: Sent on invalid payloads or unauthorized actions.

### Session lifecycle
- First player is auto-promoted to admin; if the admin disconnects, the next remaining player becomes admin.
- Disconnects remove the player from the session and trigger `players_update`.
- Empty sessions are deleted automatically.
