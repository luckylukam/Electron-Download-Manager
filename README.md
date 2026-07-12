# AriaGet

An open-source Windows download manager: an IDM-style UI/UX on top of the [aria2](https://aria2.github.io/) download engine, with one feature IDM doesn't have — **per-download network interface selection**.

100% MIT/GPL, no telemetry, no ads, no bundled offers.

## Status

Early scaffold. Working end-to-end right now:

- Electron main process spawns aria2c in RPC mode and talks to it over JSON-RPC/WebSocket
- Add Download dialog (URL, file name, save-to folder, category, description, connections, start-now-vs-queued)
- **Network interface dropdown**, fully wired: enumerates real adapters, shows IP + connection status, warns if the selected adapter is down, and passes the choice through as aria2's `--interface` option on that specific download
- Downloads table with live polling, category sidebar with counts, toolbar, status bar, dark/light theme
- Settings window with a working Connection tab (default interface, max connections, concurrency, global speed limits)

Stubbed / next up: Scheduler enforcement loop, Categories tab editing, checksum UI, post-download actions (extract / run command / shutdown), browser extension + native messaging host, portable/installer packaging polish. See `docs/ARCHITECTURE.md` for the full feature → aria2 RPC method mapping and what's left.

## Requirements

- Node.js 18+ and npm
- A Windows machine to run/package the final app (adapter enumeration in `electron/network-interfaces.js` uses `netsh`, Windows-only)
- `aria2c.exe` — **not included in this repo**. Download it from the [aria2 releases page](https://github.com/aria2/aria2/releases) and place it at `resources/aria2c.exe` before running `npm run dev` or building. aria2 is GPL-2.0-or-later; its license text belongs in `resources/THIRD_PARTY_LICENSES/aria2-COPYING` alongside the binary.

## Development

```bash
npm install
# place aria2c.exe in resources/ first (see above)
npm run dev
```

This runs Vite (renderer, http://localhost:5173) and Electron together with hot reload.

## Building a Windows release

```bash
npm run build:win
```

Produces both an NSIS installer and a portable `.exe` via `electron-builder` (see the `build` block in `package.json`).

## Project layout

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the directory structure, the full list of aria2 RPC calls used per feature, and the network-interface enumeration approach.

## License

GPL-3.0-or-later for this project's own code (see `LICENSE`). Bundles aria2c (GPL-2.0-or-later, separate binary, not redistributed in this repo — see above). No third-party code with incompatible licenses is included.

## Contributing

Issues and PRs welcome. Please keep new dependencies MIT/BSD/Apache-2.0/GPL-compatible and avoid adding any telemetry or analytics SDKs — that's a hard project rule, not a preference.
