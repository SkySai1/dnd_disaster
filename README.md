# dnd_disaster

Minimal WebSocket server for managing lightweight D&D disaster game sessions. Sessions are kept in memory.

## Running

```bash
npm install # (no external deps, but initializes lockfile if desired)
npm start
```

The server listens on `PORT` (default `3000`).

## Protocol overview

All communication occurs over WebSocket text frames containing JSON objects. Supported message types:

- `create_session` `{ name }`: Creates a new session and joins as the first player/admin. Response: `session_created` with `sessionId` and `playerId`.
- `join_session` `{ name, sessionId }`: Joins an existing session. Response: `session_joined` with identifiers.
- `leave_session`: Removes the caller from the session.
- `set_role` `{ role }`: Updates the caller's role. Broadcasts `role_update` and `players_update`.
- `roll_dice` `{ dice }`: Server rolls dice (e.g., `d20`) and broadcasts `dice_roll`.
- `log_message` `{ message }`: Adds an entry to the session log and broadcasts `log_event`.
- `destroy_session`: Admin-only; closes the session and disconnects players.

Broadcasts include `players_update`, `role_update`, `log_event`, `dice_roll`, and `session_destroyed` messages.
