import React from 'react';

function PlayerList({ players, adminId }) {
  if (!players || players.length === 0) {
    return <p className="muted">No players yet.</p>;
  }

  return (
    <ul className="player-list">
      {players.map((player) => (
        <li key={player.playerId}>
          <div>
            <strong>{player.name}</strong>{' '}
            {adminId === player.playerId && <span className="badge">Admin</span>}
          </div>
          <div className="muted">{player.role || 'No role'}</div>
        </li>
      ))}
    </ul>
  );
}

export default PlayerList;
