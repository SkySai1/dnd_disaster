import React from 'react';
import PlayerList from './PlayerList';

function AdminView({ sessionId, players }) {
  return (
    <div className="card">
      <h3>Admin panel</h3>
      <p>You are the game master.</p>
      <p className="muted">Session: {sessionId}</p>
      <PlayerList players={players} />
    </div>
  );
}

export default AdminView;
