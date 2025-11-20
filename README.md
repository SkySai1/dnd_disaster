# dnd_disaster

Minimal WebSocket server for managing lightweight D&D disaster game sessions. Sessions are kept purely in memory.

This repository now also includes a lightweight React client for joining sessions and picking roles.
The built client is served by the same Node process as the WebSocket server so both ship together.

## Running

```bash
npm install # no external dependencies required
npm start
```

The server listens on `PORT` (default `3000`). WebSocket host/port/public URL is
set entirely through environment variables (`WS_HOST`, `WS_PORT`/`PORT`,
`PUBLIC_WS_URL`/`WS_PUBLIC_URL`). The server exposes the live configuration at
`/config/ws-config.json`, which means you can change these environment variables
and restart the server without rebuilding the client—browsers will fetch the
updated WebSocket entry point at runtime.

> ⚠️ The client tooling supports Node.js 12.22+ (including both x86_64 and arm64 builds). Node 18+ remains recommended for best dev-server compatibility.

### Client (Stage 2 prototype)

```
npm run client:install
npm run dev # Vite dev server at http://localhost:5173 (runs from ./client)
```

By default, the client fetches `/config/ws-config.json` from the server to learn the
WebSocket address at runtime. During development, `/config` requests are proxied to
`http://localhost:3000` (set `VITE_CONFIG_PROXY_TARGET` to change this) and the client
will make a second attempt to `http://localhost:3000/config/ws-config.json` if the
first lookup fails. Because the WebSocket URL is supplied by the server at runtime,
changing the environment variables above and restarting the backend is enough to
retarget clients—even after a production build.

### Docker / Compose

Build the client bundle and run the WebSocket server in a container:

```bash
docker compose up --build
```

Then open http://localhost:3000/ to reach the bundled web client; WebSocket traffic uses the same port.

The included `compose.yaml` sets sane defaults for runtime configuration:

- `WS_HOST`/`HOST`: interface for the WebSocket server (`0.0.0.0`).
- `WS_PORT`/`PORT`: listening port (`3000`).
- `PUBLIC_WS_URL`/`WS_PUBLIC_URL`: public WebSocket URL (`ws://localhost:3000`).
- `VITE_CONFIG_PROXY_TARGET`: where the client config proxy points (`http://localhost:3000`).

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
