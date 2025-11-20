import React, { useMemo } from 'react';
import AdminView from './AdminView';
import PlayerView from './PlayerView';
import PlayerList from './PlayerList';

function SessionScreen({ session, onSetRole, connectionStatus, onReconnect }) {
  const { sessionId, playerId, adminId, players } = session || {};
  const isAdmin = playerId === adminId;

  const sortedPlayers = useMemo(
    () => [...(players || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );

  const currentPlayer = sortedPlayers.find((p) => p.playerId === playerId);

  return (
    <div className="panel">
      <div className="session-header">
        <div>
          <p className="muted">Session ID</p>
          <h2>{sessionId}</h2>
        </div>
        <div className="status-line">
          <span className={`status-dot ${connectionStatus}`}></span>
          <span className="muted">{connectionStatus}</span>
          {connectionStatus !== 'connected' && (
            <button className="secondary small" onClick={onReconnect}>
              Reconnect
            </button>
          )}
        </div>
      </div>

      <div className="grid">
        <div>
          <h3>Players</h3>
          <PlayerList players={sortedPlayers} adminId={adminId} />
        </div>
        <div>
          {isAdmin ? (
            <AdminView sessionId={sessionId} players={sortedPlayers} />
          ) : (
            <PlayerView
              players={sortedPlayers}
              currentPlayer={currentPlayer}
              onSetRole={onSetRole}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default SessionScreen;
