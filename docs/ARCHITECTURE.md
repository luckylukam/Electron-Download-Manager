# Architecture & aria2 RPC Command Mapping

## 1. High-level structure

```
idm-aria2-gui/
├── electron/                    # Electron main process (Node context)
│   ├── main.js                  # App lifecycle, window creation, tray
│   ├── preload.js               # contextBridge — safe IPC surface exposed to renderer
│   ├── aria2-process.js         # Spawns/monitors the bundled aria2c daemon
│   ├── aria2-rpc.js             # Thin JSON-RPC 2.0 client over WebSocket (ws://) to aria2
│   ├── network-interfaces.js    # Adapter enumeration (os.networkInterfaces + netsh)
│   ├── scheduler.js             # cron-like time-window start/stop
│   ├── post-download.js         # extract / run-command / shutdown actions
│   ├── native-messaging-host.js # Handles messages from the browser extension
│   └── store.js                 # electron-store wrapper for settings/categories
├── src/                         # React renderer
│   ├── App.jsx
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Toolbar.jsx
│   │   ├── DownloadTable.jsx
│   │   ├── DownloadRow.jsx
│   │   ├── SpeedSparkline.jsx
│   │   ├── StatusBar.jsx
│   │   ├── AddDownloadDialog.jsx
│   │   ├── InterfaceSelect.jsx  # the network-interface dropdown (shared by dialog + settings)
│   │   ├── SettingsWindow.jsx
│   │   └── tabs/ (General, SaveTo, Connection, Categories, Scheduler, Proxy, Advanced)
│   ├── hooks/
│   │   ├── useAria2.js          # subscribes to polling/WS updates, exposes actions
│   │   └── useNetworkInterfaces.js
│   ├── store/downloadsStore.js  # zustand store: downloads, categories, filters
│   └── styles/theme.css         # CSS variables, dark/light tokens
├── browser-extension/           # WebExtensions (Chrome/Edge/Firefox), manifest v3
├── resources/                   # bundled aria2c.exe, icons
├── build/                       # electron-builder output config (nsis + portable)
└── package.json
```

**Why Electron + aria2 as a separate process, not a library:** aria2c already implements the entire download engine (segmented downloads, BT, metalink, resume) and exposes it over JSON-RPC. The app's job is orchestration + UI, not reimplementing a download engine. This mirrors how the popular `aria2-desktop` / `motrix` clones work, but we build the IDM-specific UX and the interface-selection feature ourselves.

The main process spawns `aria2c --enable-rpc --rpc-listen-port=6800 --rpc-secret=<random>` on launch (bundled binary, GPLv2+, redistributable), and the renderer never talks to aria2 directly — all RPC calls go through `electron/aria2-rpc.js` in the main process and are relayed via IPC (`ipcMain.handle` / `ipcRenderer.invoke`), keeping `contextIsolation: true` and `nodeIntegration: false` in the renderer.

## 2. aria2 RPC → feature mapping

| Feature | aria2 RPC method | Key options used |
|---|---|---|
| Add HTTP/HTTPS/FTP/SFTP download | `aria2.addUri(uris, options)` | `dir`, `out`, `split`, `max-connection-per-server`, `header`, `interface`, `checksum`, `check-integrity` |
| Add BitTorrent (.torrent) | `aria2.addTorrent(torrent_b64, uris, options)` | same option set + `bt-*` |
| Add magnet link | `aria2.addUri([magnetUri], options)` | aria2 treats magnets as URIs |
| Add Metalink | `aria2.addMetalink(metalink_b64, options)` | `dir`, `interface` |
| Batch add (URL list / text file) | Repeated `aria2.addUri` calls, or `system.multicall` for one round-trip | one call per line, all sharing the dialog's option set |
| Per-download interface override | `options.interface` passed at `addUri`/`addTorrent` time | `--interface=<name_or_ip>` |
| Change interface after add (before it starts) | `aria2.changeOption(gid, {interface: ...})` | only valid pre-active per aria2 semantics; UI disables the field once a segment has started |
| Global default interface | `aria2.changeGlobalOption({interface: ...})` on save in Settings → Connection | applied to all subsequent adds that don't override |
| Pause one | `aria2.pause(gid)` (graceful) / `aria2.forcePause(gid)` | |
| Pause all | `aria2.pauseAll()` | |
| Resume one / all | `aria2.unpause(gid)` / `aria2.unpauseAll()` | |
| Cancel / remove | `aria2.remove(gid)` or `aria2.forceRemove(gid)`, then `aria2.removeDownloadResult(gid)` to clear it from the result list | |
| Resume after app/network restart | `aria2.saveSession()` on quit (requires `--save-session` config) + on launch, `aria2c` is started with `--input-file=<session file>` so it re-adds all incomplete GIDs automatically | |
| Queueing / max simultaneous | `aria2.changeGlobalOption({'max-concurrent-downloads': n})` | aria2's built-in queue; extra items sit in `waiting` state |
| Global speed limits | `aria2.changeGlobalOption({'max-overall-download-limit': x, 'max-overall-upload-limit': y})` | |
| Per-download speed limit | `options.max-download-limit` / `max-upload-limit` at add time, or `aria2.changeOption(gid, {...})` while active | |
| Scheduler (time windows) | Renderer-side (or `electron/scheduler.js`) cron timer calling `aria2.pauseAll()` / `aria2.unpauseAll()` at configured times; new adds outside the window use `aria2.addUri` with `pause: true` until the window opens | aria2 has no native scheduler, so this is orchestrated by the app |
| Status polling for table | `aria2.tellActive()`, `aria2.tellWaiting(offset, num)`, `aria2.tellStopped(offset, num)` polled every 1s, or a single `system.multicall` batching all three | drives Name/Size/Status/Speed/Time-Left columns |
| Per-download detail / speed graph | `aria2.tellStatus(gid, keys)` polled while a row is selected | `completedLength`, `totalLength`, `downloadSpeed` sampled into a ring buffer client-side for the sparkline |
| Checksum verification | `options.checksum = 'sha-256=<hex>'` + `check-integrity: true` at add time | aria2 verifies after completion natively |
| Auto-retry failed | `options['max-tries']`, `options['retry-wait']` at add time | aria2 native retry; app also offers a manual "retry" that re-issues `addUri` with the same options if aria2's own retries are exhausted |
| Post-download actions | Not aria2 RPC — driven by `aria2.onDownloadComplete` notification (WS event) in `electron/post-download.js`, which then runs extraction (bundled 7-Zip lib), a user command, or shutdown | |
| Categorization | App-level only: each category maps to a default `dir`; the table's category counts are computed client-side from `tellActive/Waiting/Stopped` grouped by file extension | |
| Proxy | `aria2.changeGlobalOption({'all-proxy': 'http://user:pass@host:port'})` | |
| Advanced/raw passthrough | Settings → Advanced free-text box maps directly into the `options` object passed to `changeGlobalOption`, validated against aria2's documented option list before sending | |

## 3. Network interface enumeration

`electron/network-interfaces.js` combines two sources so the dropdown shows both a friendly name and an IP:

1. `os.networkInterfaces()` (Node built-in) — gives IPv4/IPv6 addresses and internal/up-ish info per adapter key.
2. `netsh interface show interface` (spawned via `child_process.execFile`, Windows-only) — gives the human-friendly adapter name and live Enabled/Connected state, which `os.networkInterfaces()` does not expose directly.

The two are cross-referenced by adapter name to produce entries like:

```js
{ name: "Wi-Fi", ip: "192.168.1.42", status: "Connected", isUp: true }
{ name: "Ethernet", ip: "10.0.0.5", status: "Connected", isUp: true }
{ name: "Bluetooth Network Connection", ip: null, status: "Disconnected", isUp: false }
```

Selecting a down interface shows an inline warning but does not block selection (aria2 will simply fail to bind, and the app surfaces that as a per-download error).

## 4. IPC contract (renderer ⇄ main)

Exposed via `preload.js` as `window.api.*`, all promise-based:

- `api.addDownload(payload)` → wraps `addUri`/`addTorrent`/`addMetalink`
- `api.listDownloads()` → merged active/waiting/stopped
- `api.pause(gid)`, `api.resume(gid)`, `api.remove(gid)`
- `api.getInterfaces()` → network-interfaces.js result
- `api.getSettings()`, `api.saveSettings(patch)`
- `api.onDownloadEvent(callback)` → subscribes to aria2 WS notifications relayed from main

This keeps `nodeIntegration: false` / `contextIsolation: true`, so the renderer never gets raw Node or child_process access — required for a safe Electron app that also loads remote content (download URLs, thumbnails).
