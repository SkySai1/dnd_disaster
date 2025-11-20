import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import JoinSessionScreen from './components/JoinSessionScreen';
import SessionScreen from './components/SessionScreen';
import sessionSocket from './socket/sessionSocket';
import { fetchWsConfig } from './configLoader';

function useSessionIdFromUrl() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const querySession = searchParams.get('sessionId') || '';
  return params.sessionId || querySession;
}

function SessionRoute() {
  const navigate = useNavigate();
  const sessionIdFromUrl = useSessionIdFromUrl();

  const [sessionState, setSessionState] = useState(null);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    sessionSocket.getStatus()
  );

  const handleMessage = useCallback(
    (message) => {
      switch (message.type) {
        case 'session_joined': {
          setError('');
          setSessionState({
            sessionId: message.sessionId,
            playerId: message.playerId,
            adminId: message.adminId,
            players: message.players || [],
            roles: message.roles || [],
          });
          if (message.sessionId && sessionIdFromUrl !== message.sessionId) {
            navigate(`/session/${message.sessionId}`, { replace: true });
          }
          break;
        }
        case 'players_update': {
          setSessionState((prev) =>
            prev
              ? {
                  ...prev,
                  players: message.players || [],
                  adminId: message.adminId || prev.adminId,
                }
              : prev
          );
          break;
        }
        case 'roles_update': {
          setSessionState((prev) =>
            prev
              ? {
                  ...prev,
                  roles: message.roles || [],
                }
              : prev
          );
          break;
        }
        case 'role_update': {
          setSessionState((prev) => {
            if (!prev) return prev;
            const updatedPlayers = prev.players.map((p) =>
              p.playerId === message.playerId ? { ...p, role: message.role } : p
            );
            return { ...prev, players: updatedPlayers };
          });
          break;
        }
        case 'error': {
          setError(message.message || 'Unknown error');
          break;
        }
        default:
          break;
      }
    },
    [navigate, sessionIdFromUrl]
  );

  useEffect(() => {
    let cancelled = false;
    fetchWsConfig()
      .then((cfg) => {
        if (cancelled) return;
        sessionSocket.setWsUrl(cfg.wsUrl);
        setConfigLoaded(true);
        setConfigError(cfg.error ? `Config fallback: ${cfg.error}` : '');
      })
      .catch((err) => {
        if (cancelled) return;
        setConfigLoaded(true);
        setConfigError(err?.message || 'Failed to load configuration');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = sessionSocket.subscribe(handleMessage);
    const unsubscribeStatus = sessionSocket.subscribeStatus(setConnectionStatus);
    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  }, [handleMessage]);

  const onJoinSession = useCallback(
    async (sessionId, name) => {
      setError('');
      await sessionSocket.connect();
      sessionSocket.send({ type: 'join_session', sessionId, name });
    },
    []
  );

  const onCreateSession = useCallback(async (name) => {
    setError('');
    await sessionSocket.connect();
    sessionSocket.send({ type: 'create_session', name });
  }, []);

  const onSetRole = useCallback((role) => {
    sessionSocket.send({ type: 'set_role', role });
  }, []);

  const onUpdateRoles = useCallback((roles) => {
    sessionSocket.send({ type: 'update_roles', roles });
  }, []);

  const onReconnect = useCallback(() => {
    sessionSocket.connect();
  }, []);

  const isJoined = useMemo(
    () => sessionState && sessionState.sessionId,
    [sessionState]
  );

  return (
    <div className="app-shell">
      {!configLoaded && <div className="toast info">Загрузка конфигурации...</div>}
      {isJoined ? (
          <SessionScreen
            session={sessionState}
            onSetRole={onSetRole}
            onUpdateRoles={onUpdateRoles}
            connectionStatus={connectionStatus}
            onReconnect={onReconnect}
          />
      ) : (
        <JoinSessionScreen
          defaultSessionId={sessionIdFromUrl}
          onJoinSession={onJoinSession}
          onCreateSession={onCreateSession}
          error={error}
          connectionStatus={connectionStatus}
        />
      )}
      {error && <div className="toast error">{error}</div>}
      {configError && <div className="toast warning">{configError}</div>}
      {connectionStatus !== 'connected' && (
        <div className="toast warning">Connection: {connectionStatus}</div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/session/:sessionId" element={<SessionRoute />} />
        <Route path="/" element={<SessionRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
