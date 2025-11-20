function buildDefaultWsUrl() {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}`;
}

const DEFAULT_WS_URL = buildDefaultWsUrl();
const DEFAULT_CONFIG_ENDPOINT = '/config/ws-config.json';
const FALLBACK_CONFIG_ORIGIN = 'http://localhost:3000';

async function fetchConfigOnce(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Config request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchWsConfig() {
  const endpoint = DEFAULT_CONFIG_ENDPOINT;
  const attempts = [endpoint];

  if (endpoint.startsWith('/') && FALLBACK_CONFIG_ORIGIN) {
    attempts.push(`${FALLBACK_CONFIG_ORIGIN.replace(/\/$/, '')}${endpoint}`);
  }

  const errors = [];

  for (const url of attempts) {
    try {
      const json = await fetchConfigOnce(url);
      return {
        wsUrl:
          json.wsUrl ||
          (json.host && json.port
            ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${json.host}:${json.port}`
            : null) ||
          DEFAULT_WS_URL,
        host: json.host,
        port: json.port,
        source: `remote-config:${url}`,
      };
    } catch (err) {
      errors.push({ url, message: err?.message });
    }
  }

  console.warn('Falling back to inline WebSocket URL due to config fetch errors:', errors);
  return {
    wsUrl: DEFAULT_WS_URL,
    host: undefined,
    port: undefined,
    source: 'fallback',
    error: errors.map((e) => `${e.url}: ${e.message}`).join('; '),
  };
}
