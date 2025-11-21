import React, { useEffect, useMemo, useState } from 'react';
import PlayerList from './PlayerList';

const DEFAULT_ROLE = 'Guest';

function AdminView({
  sessionId,
  players,
  roles,
  onUpdateRoles,
  adminId,
  diceWindowOpen,
  diceRoundId,
  diceResults,
  onOpenDiceWindow,
  onCloseDiceWindow,
}) {
  const [roleInput, setRoleInput] = useState('');
  const [draftRoles, setDraftRoles] = useState([]);

  useEffect(() => {
    setDraftRoles(roles || []);
  }, [roles]);

  const takenRoleIds = useMemo(() => {
    return new Set((players || []).map((player) => player.role).filter(Boolean));
  }, [players]);

  const handleAddRole = (event) => {
    event.preventDefault();
    const nextRole = roleInput.trim();
    if (!nextRole) return;
    if (draftRoles.some((role) => role.toLowerCase() === nextRole.toLowerCase())) {
      setRoleInput('');
      return;
    }
    const updated = [...draftRoles, nextRole];
    setDraftRoles(updated);
    onUpdateRoles?.(updated);
    setRoleInput('');
  };

  const handleRemoveRole = (role) => {
    if (role.toLowerCase() === DEFAULT_ROLE.toLowerCase()) return;
    const updated = draftRoles.filter((item) => item !== role);
    setDraftRoles(updated);
    onUpdateRoles?.(updated);
  };

  return (
    <div className="card">
      <h3>Admin panel</h3>
      <p>You are the game master.</p>
      <p className="muted">Session: {sessionId}</p>

      <div className="dice-controls">
        <div>
          <p className="muted">Dice window</p>
          <strong>{diceWindowOpen ? 'Open' : 'Closed'}</strong>
          {diceRoundId ? <span className="muted"> (Round {diceRoundId})</span> : null}
        </div>
        <div className="actions">
          <button type="button" onClick={onOpenDiceWindow} disabled={diceWindowOpen}>
            Open Dice Window
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onCloseDiceWindow}
            disabled={!diceWindowOpen}
          >
            Close Dice Window
          </button>
        </div>
      </div>

      <form className="form" onSubmit={handleAddRole}>
        <label>
          Добавить роль
          <div className="actions">
            <input
              placeholder="Например: Пилот"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
            />
            <button type="submit">Добавить</button>
          </div>
        </label>
      </form>

      <h4>Доступные роли</h4>
      <ul className="role-list">
        {draftRoles.map((role) => {
          const taken = takenRoleIds.has(role);
          const isDefault = role.toLowerCase() === DEFAULT_ROLE.toLowerCase();
          return (
            <li key={role} className={taken ? 'muted' : ''}>
              <span>{role}</span>
              <div className="actions">
                {taken && <span className="badge">Занята</span>}
                {!isDefault && (
                  <button
                    className="secondary small"
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <h4>Игроки</h4>
      <PlayerList
        players={players}
        adminId={adminId}
        diceResults={diceResults}
        diceRoundId={diceRoundId}
      />
    </div>
  );
}

export default AdminView;
