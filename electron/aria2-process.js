const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Wraps the bundled aria2c binary as a long-lived child process exposing
 * JSON-RPC over WebSocket. aria2c itself is GPL-2.0-or-later and is
 * redistributed unmodified alongside the app (see /resources/aria2c.exe
 * and /resources/THIRD_PARTY_LICENSES/aria2-COPYING).
 */
class Aria2Process {
  constructor({ rpcPort, rpcSecret, sessionFile }) {
    this.rpcPort = rpcPort;
    this.rpcSecret = rpcSecret;
    this.sessionFile = sessionFile;
    this.proc = null;
  }

  get binaryPath() {
    // Packaged app: resources/aria2c.exe next to the executable.
    // Dev mode: resources/aria2c.exe in the repo root.
    return app.isPackaged
      ? path.join(process.resourcesPath, 'aria2c.exe')
      : path.join(__dirname, '..', 'resources', 'aria2c.exe');
  }

  start() {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.binaryPath)) {
        // Allow dev machines without the binary bundled yet to still boot the UI
        // against a manually-started aria2c, rather than hard-crash the app.
        console.warn(
          `[aria2-process] aria2c.exe not found at ${this.binaryPath}. ` +
          'Start aria2c manually with --enable-rpc, or run scripts/fetch-aria2.js.'
        );
        return resolve();
      }

      if (!fs.existsSync(this.sessionFile)) {
        fs.writeFileSync(this.sessionFile, '');
      }

      const args = [
        '--enable-rpc',
        `--rpc-listen-port=${this.rpcPort}`,
        `--rpc-secret=${this.rpcSecret}`,
        '--rpc-listen-all=false',
        '--rpc-allow-origin-all=false',
        '--continue=true',
        '--max-connection-per-server=16',
        '--save-session-interval=60',
        `--save-session=${this.sessionFile}`,
        `--input-file=${this.sessionFile}`,
        '--daemon=false'
      ];

      this.proc = spawn(this.binaryPath, args, { windowsHide: true });

      let ready = false;
      const onData = (data) => {
        const text = data.toString();
        if (!ready && /RPC/i.test(text)) {
          ready = true;
          resolve();
        }
      };

      this.proc.stdout.on('data', onData);
      this.proc.stderr.on('data', onData);
      this.proc.on('error', reject);

      // Fallback: aria2c binds the RPC port almost instantly; don't block
      // app startup forever if we never see the expected log line.
      setTimeout(() => {
        if (!ready) {
          ready = true;
          resolve();
        }
      }, 2000);
    });
  }

  stop() {
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
  }
}

module.exports = Aria2Process;
