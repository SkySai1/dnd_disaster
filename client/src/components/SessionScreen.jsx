import React, { useMemo } from 'react';
import AdminView from './AdminView';
import PlayerView from './PlayerView';
import PlayerList from './PlayerList';
import EventLog from './EventLog';

function SessionScreen({
  session,
  onSetRole,
  onUpdateRoles,
  onSendLog,
  onOpenDiceWindow,
  onCloseDiceWindow,
  onRollDice,
  connectionStatus,
  onReconnect,
}) {
  const {
    sessionId,
    playerId,
    adminId,
    players,
    roles,
    log,
    diceWindowOpen,
    diceRoundId,
    diceResults,
  } = session || {};
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
          <PlayerList
            players={sortedPlayers}
            adminId={adminId}
            diceResults={diceResults}
            diceRoundId={diceRoundId}
          />
        </div>
        <div>
          {isAdmin ? (
            <AdminView
              sessionId={sessionId}
              players={sortedPlayers}
              roles={roles}
              onUpdateRoles={onUpdateRoles}
              diceWindowOpen={diceWindowOpen}
              diceRoundId={diceRoundId}
              onOpenDiceWindow={onOpenDiceWindow}
              onCloseDiceWindow={onCloseDiceWindow}
            />
          ) : (
            <PlayerView
              players={sortedPlayers}
              currentPlayer={currentPlayer}
              roles={roles}
              onSetRole={onSetRole}
              diceWindowOpen={diceWindowOpen}
              diceRoundId={diceRoundId}
              diceResults={diceResults}
              onRollDice={onRollDice}
            />
          )}
        </div>
      </div>

      <div className="log-section">
        <h3>Event log</h3>
        <EventLog log={log || []} onSend={onSendLog} />
      </div>
    </div>
  );
}

export default SessionScreen;
