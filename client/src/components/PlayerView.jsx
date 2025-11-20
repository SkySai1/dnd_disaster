import React from 'react';

const AVAILABLE_ROLES = [
  { id: 'main_engineer', label: 'Главный инженер' },
  { id: 'proxy_dns', label: 'Инженер Proxy/DNS' },
  { id: 'network', label: 'Сетевой инженер' },
  { id: 'cloud', label: 'Cloud инженер' },
  { id: 'observer', label: 'Наблюдатель' },
];

function PlayerView({ players, currentPlayer, onSetRole }) {
  const currentRole = currentPlayer?.role || 'No role';

  const isRoleTakenByOther = (roleId) => {
    if (!roleId || roleId === 'observer') return false;
    const owner = players?.find((p) => p.role === roleId);
    return owner && owner.playerId !== currentPlayer?.playerId;
  };

  return (
    <div className="card">
      <h3>Player panel</h3>
      <p>
        You are:{' '}
        <strong>
          {currentPlayer?.name} ({currentRole})
        </strong>
      </p>

      <div className="roles">
        {AVAILABLE_ROLES.map((role) => {
          const taken = isRoleTakenByOther(role.id);
          const isActive = currentPlayer?.role === role.id;
          return (
            <button
              key={role.id}
              className={`role ${taken ? 'taken' : ''} ${isActive ? 'active' : ''}`}
              disabled={taken}
              onClick={() => onSetRole(role.id)}
            >
              <div className="role-label">{role.label}</div>
              {taken && <div className="muted">Occupied</div>}
              {isActive && <div className="badge">You</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PlayerView;
