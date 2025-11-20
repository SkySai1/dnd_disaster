import React, { useEffect, useState } from 'react';

function JoinSessionScreen({
  defaultSessionId,
  onJoinSession,
  onCreateSession,
  error,
  connectionStatus,
}) {
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState(defaultSessionId || '');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    setSessionId(defaultSessionId || '');
  }, [defaultSessionId]);

  const disabled = !name || isJoining;

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!sessionId || !name) return;
    setIsJoining(true);
    try {
      await onJoinSession(sessionId.trim(), name.trim());
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setIsJoining(true);
    try {
      await onCreateSession(name.trim());
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="panel">
      <h1>Join a session</h1>
      <p className="muted">
        Enter your display name and the session ID shared by the game master.
      </p>
      <form onSubmit={handleJoin} className="form">
        <label>
          Display name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </label>
        <label>
          Session ID
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="ABC123"
            required
          />
        </label>
        <div className="actions">
          <button type="submit" disabled={disabled}>
            {isJoining ? 'Joining...' : 'Join session'}
          </button>
          <button type="button" className="secondary" onClick={handleCreate} disabled={!name || isJoining}>
            {isJoining ? 'Creating...' : 'Create new session'}
          </button>
        </div>
      </form>
      {error && <div className="error-box">{error}</div>}
      <p className="muted">Connection status: {connectionStatus}</p>
    </div>
  );
}

export default JoinSessionScreen;
