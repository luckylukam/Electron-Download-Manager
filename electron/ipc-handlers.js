/**
 * Wires ipcMain handlers to the Aria2Rpc client. Kept separate from main.js
 * so the RPC <-> IPC contract (see docs/ARCHITECTURE.md §4) is easy to audit
 * and unit-test in isolation.
 */
function registerAria2Handlers(ipcMain, rpc, getWindow) {
  // Relay aria2's push notifications straight to the renderer.
  const NOTIFY_METHODS = [
    'aria2.onDownloadStart',
    'aria2.onDownloadPause',
    'aria2.onDownloadStop',
    'aria2.onDownloadComplete',
    'aria2.onDownloadError',
    'aria2.onBtDownloadComplete'
  ];
  rpc.on('notification', (method, params) => {
    if (!NOTIFY_METHODS.includes(method)) return;
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('aria2:event', { method, params });
    }
  });

  ipcMain.handle('aria2:addDownload', async (_evt, payload) => {
    const {
      urls, // array of URL strings (batch add supported)
      torrentBase64,
      metalinkBase64,
      dir,
      out,
      category,
      description, // stored client-side; aria2 has no native "description" field
      networkInterface,
      maxConnections,
      maxDownloadLimit,
      maxUploadLimit,
      checksum, // 'sha-256=<hex>'
      startImmediately,
      maxTries,
      retryWait,
      header
    } = payload;

    const options = {};
    if (dir) options.dir = dir;
    if (out) options.out = out;
    if (networkInterface) options.interface = networkInterface;
    if (maxConnections) options['max-connection-per-server'] = String(maxConnections);
    if (maxDownloadLimit) options['max-download-limit'] = maxDownloadLimit;
    if (maxUploadLimit) options['max-upload-limit'] = maxUploadLimit;
    if (checksum) {
      options.checksum = checksum;
      options['check-integrity'] = 'true';
    }
    if (maxTries !== undefined) options['max-tries'] = String(maxTries);
    if (retryWait !== undefined) options['retry-wait'] = String(retryWait);
    if (header && header.length) options.header = header;
    if (startImmediately === false) options.pause = 'true';

    const gids = [];

    if (torrentBase64) {
      gids.push(await rpc.call('aria2.addTorrent', torrentBase64, [], options));
    } else if (metalinkBase64) {
      const result = await rpc.call('aria2.addMetalink', metalinkBase64, options);
      gids.push(...result);
    } else if (urls && urls.length) {
      // Each URL in the batch gets its own GID but shares the dialog's options.
      // For a true single multi-source download, pass all urls as one array instead.
      for (const url of urls) {
        // eslint-disable-next-line no-await-in-loop
        const gid = await rpc.call('aria2.addUri', [url], options);
        gids.push(gid);
      }
    } else {
      throw new Error('No URL, torrent, or metalink provided.');
    }

    return { gids, category, description };
  });

  ipcMain.handle('aria2:listDownloads', async () => {
    const [active, waiting, stopped] = await rpc.multicall([
      { methodName: 'aria2.tellActive', params: [] },
      { methodName: 'aria2.tellWaiting', params: [0, 1000] },
      { methodName: 'aria2.tellStopped', params: [0, 1000] }
    ]);
    return {
      active: active[0] || [],
      waiting: waiting[0] || [],
      stopped: stopped[0] || []
    };
  });

  ipcMain.handle('aria2:getStatus', (_evt, gid) =>
    rpc.call('aria2.tellStatus', gid)
  );

  ipcMain.handle('aria2:pause', (_evt, gid) => rpc.call('aria2.pause', gid));
  ipcMain.handle('aria2:pauseAll', () => rpc.call('aria2.pauseAll'));
  ipcMain.handle('aria2:resume', (_evt, gid) => rpc.call('aria2.unpause', gid));
  ipcMain.handle('aria2:resumeAll', () => rpc.call('aria2.unpauseAll'));

  ipcMain.handle('aria2:remove', async (_evt, gid) => {
    try {
      await rpc.call('aria2.remove', gid);
    } catch {
      await rpc.call('aria2.forceRemove', gid);
    }
  });

  ipcMain.handle('aria2:removeResult', (_evt, gid) => rpc.call('aria2.removeDownloadResult', gid));

  ipcMain.handle('aria2:changeOption', (_evt, gid, options) => rpc.call('aria2.changeOption', gid, options));

  ipcMain.handle('aria2:changeGlobalOption', (_evt, options) => rpc.call('aria2.changeGlobalOption', options));
}

module.exports = { registerAria2Handlers };
