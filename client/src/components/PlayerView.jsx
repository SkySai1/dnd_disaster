import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_ROLE = 'Guest';

function PlayerView({
  players,
  currentPlayer,
  roles,
  onSetRole,
  diceWindowOpen,
  diceRoundId,
  diceResults,
  onRollDice,
}) {
  const [isChooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    if (!currentPlayer?.role) {
      setChooserOpen(true);
    }
  }, [currentPlayer?.role]);

  const availableRoles = useMemo(() => {
    if (roles && roles.length > 0) return roles;
    return [DEFAULT_ROLE];
  }, [roles]);

  const takenByOther = useMemo(() => {
    const lookup = new Map();
    (players || []).forEach((player) => {
      if (player.role) {
        lookup.set(player.role, player.playerId);
      }
    });
    return lookup;
  }, [players]);

  const handleSelectRole = (role) => {
    onSetRole(role);
    setChooserOpen(false);
  };

  const currentResult = diceResults?.[currentPlayer?.playerId];
  const hasRolled = currentResult && currentResult.roundId === diceRoundId;

  const renderRoleButton = (role) => {
    const takenBy = takenByOther.get(role);
    const isTaken = Boolean(takenBy && takenBy !== currentPlayer?.playerId);
    const isActive = currentPlayer?.role === role;
    return (
      <button
        key={role}
        className={`role ${isTaken ? 'taken' : ''} ${isActive ? 'active' : ''}`}
        disabled={isTaken}
        onClick={() => handleSelectRole(role)}
      >
        <div className="role-label">{role}</div>
        {isTaken && <div className="muted">Занята другим игроком</div>}
        {isActive && <div className="badge">Вы</div>}
      </button>
    );
  };

  return (
    <div className="card">
      <h3>Player panel</h3>
      <p>
        Вы вошли как{' '}
        <strong>
          {currentPlayer?.name} ({currentPlayer?.role || 'роль не выбрана'})
        </strong>
      </p>

      <div className="actions" style={{ marginTop: '8px' }}>
        <button className="secondary" onClick={() => setChooserOpen(true)}>
          Выбрать роль
        </button>
        {currentPlayer?.role && (
          <button className="secondary" onClick={() => handleSelectRole(null)}>
            Сбросить роль
          </button>
        )}
      </div>

      <div className="dice-panel">
        <h4>Dice roll</h4>
        <p className="muted">
          {diceRoundId ? `Round ${diceRoundId}` : 'No dice round yet'} |{' '}
          {diceWindowOpen ? 'Window open' : 'Window closed'}
        </p>
        {diceWindowOpen ? (
          hasRolled ? (
            <div className="badge">Your result: {currentResult.value}</div>
          ) : (
            <button type="button" onClick={() => onRollDice?.()}>
              Roll d20
            </button>
          )
        ) : hasRolled ? (
          <div className="badge secondary">Your result: {currentResult.value}</div>
        ) : (
          <p className="muted">Dice window is closed.</p>
        )}
      </div>

      {(isChooserOpen || !currentPlayer?.role) && (
        <div className="role-modal">
          <div className="role-modal__content">
            <div className="role-modal__header">
              <h4>Выберите свободную роль</h4>
              {currentPlayer?.role && (
                <button
                  className="secondary small"
                  onClick={() => setChooserOpen(false)}
                >
                  Закрыть
                </button>
              )}
            </div>
            <p className="muted">
              После выбора роль закрепляется за вами, пока вы не покинете сессию или не
              сбросите её вручную.
            </p>
            <div className="roles">{availableRoles.map(renderRoleButton)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerView;
