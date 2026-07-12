const WebSocket = require('ws');
const { EventEmitter } = require('events');

/**
 * Thin JSON-RPC 2.0 client over aria2's WebSocket RPC endpoint.
 * WebSocket (rather than plain HTTP POST) is used so we can also receive
 * aria2's push notifications (onDownloadStart, onDownloadComplete,
 * onDownloadError, onBtDownloadComplete) and relay them to the renderer
 * for real-time table/toast updates instead of polling alone.
 */
class Aria2Rpc extends EventEmitter {
  constructor({ host, port, secret }) {
    super();
    this.url = `ws://${host}:${port}/jsonrpc`;
    this.secret = secret;
    this.ws = null;
    this.pending = new Map();
    this.nextId = 1;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.once('open', resolve);
      this.ws.once('error', reject);

      this.ws.on('message', (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message || 'aria2 RPC error'));
          else res(msg.result);
          return;
        }

        // Server-pushed notification, e.g. { method: 'aria2.onDownloadComplete', params: [{gid}] }
        if (msg.method) {
          this.emit('notification', msg.method, msg.params);
        }
      });

      this.ws.on('close', () => this.emit('disconnected'));
    });
  }

  call(method, ...params) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      // aria2 expects the RPC secret as the first param, prefixed "token:".
      const finalParams = this.secret ? [`token:${this.secret}`, ...params] : params;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params: finalParams }));
    });
  }

  /** Batch multiple calls into a single round trip via system.multicall. */
  multicall(calls) {
    // calls: [{ methodName: 'aria2.tellActive', params: [] }, ...]
    const withToken = calls.map((c) => ({
      methodName: c.methodName,
      params: this.secret ? [`token:${this.secret}`, ...(c.params || [])] : c.params || []
    }));
    return this.call('system.multicall', withToken);
  }
}

module.exports = Aria2Rpc;
