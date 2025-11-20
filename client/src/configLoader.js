function buildDefaultWsUrl() {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}`;
}

const DEFAULT_WS_URL = buildDefaultWsUrl();
const DEFAULT_CONFIG_ENDPOINT = '/config/ws-config.json';

export async function fetchWsConfig() {
  const endpoint = import.meta.env.VITE_CONFIG_URL || DEFAULT_CONFIG_ENDPOINT;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Config request failed with status ${response.status}`);
    }
    const json = await response.json();
    return {
      wsUrl:
        json.wsUrl ||
        (json.host && json.port
          ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${json.host}:${json.port}`
          : null) ||
        import.meta.env.VITE_WS_URL ||
        DEFAULT_WS_URL,
      host: json.host,
      port: json.port,
      source: 'remote-config',
    };
  } catch (err) {
    console.warn('Falling back to inline WebSocket URL due to config fetch error:', err);
    return {
      wsUrl: import.meta.env.VITE_WS_URL || DEFAULT_WS_URL,
      host: undefined,
      port: undefined,
      source: 'fallback',
      error: err?.message,
    };
  }
}
