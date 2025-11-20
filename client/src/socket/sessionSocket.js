const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000`;

class SessionSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.status = 'disconnected';
    this.connectPromise = null;
    this.queue = [];
  }

  setStatus(status) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  subscribe(handler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  subscribeStatus(handler) {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => this.statusListeners.delete(handler);
  }

  getStatus() {
    return this.status;
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.connectPromise) return this.connectPromise;

    this.setStatus('connecting');

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);
      } catch (err) {
        this.setStatus('disconnected');
        this.connectPromise = null;
        reject(err);
        return;
      }

      this.ws.addEventListener('open', () => {
        this.setStatus('connected');
        this.queue.forEach((msg) => this.ws?.send(msg));
        this.queue = [];
        this.connectPromise = null;
        resolve();
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((handler) => handler(data));
        } catch (err) {
          console.error('Invalid message from server', err);
        }
      });

      this.ws.addEventListener('close', () => {
        this.setStatus('disconnected');
        this.ws = null;
        this.connectPromise = null;
      });

      this.ws.addEventListener('error', () => {
        this.setStatus('disconnected');
      });
    });

    return this.connectPromise;
  }

  send(payload) {
    const message = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return;
    }
    this.queue.push(message);
    this.connect();
  }
}

const sessionSocket = new SessionSocket();
export default sessionSocket;
