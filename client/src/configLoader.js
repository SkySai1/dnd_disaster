const DEFAULT_WS_URL = `ws://${window.location.hostname}:3000`;
const DEFAULT_CONFIG_ENDPOINT = `${window.location.protocol}//${window.location.hostname}:3000/config/ws-config.json`;

export async function fetchWsConfig() {
  const endpoint = import.meta.env.VITE_CONFIG_URL || DEFAULT_CONFIG_ENDPOINT;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Config request failed with status ${response.status}`);
    }
    const json = await response.json();
    return {
      wsUrl: json.wsUrl || import.meta.env.VITE_WS_URL || DEFAULT_WS_URL,
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
