import React from 'react';

function PlayerList({ players, adminId, diceResults, diceRoundId }) {
  if (!players || players.length === 0) {
    return <p className="muted">No players yet.</p>;
  }

  return (
    <ul className="player-list">
      {players.map((player) => {
        const result = diceResults?.[player.playerId];
        const hasCurrentRound = result && diceRoundId && result.roundId === diceRoundId;
        return (
          <li key={player.playerId}>
            <div className="player-line">
              <div className="dice-indicator" title="Dice result">
                {hasCurrentRound ? result.value : '-'}
              </div>
              <div>
                <strong>{player.name}</strong>{' '}
                {adminId === player.playerId && <span className="badge">Admin</span>}
              </div>
            </div>
            <div className="muted">{player.role || 'Роль не выбрана'}</div>
          </li>
        );
      })}
    </ul>
  );
}

export default PlayerList;
