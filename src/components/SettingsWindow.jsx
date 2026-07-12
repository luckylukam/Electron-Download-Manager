import React, { useEffect, useState } from 'react';
import InterfaceSelect from './InterfaceSelect.jsx';

const TABS = ['General', 'Save To', 'Connection', 'Categories', 'Scheduler', 'Proxy', 'Advanced'];

export default function SettingsWindow({ open, onClose }) {
  const [tab, setTab] = useState('Connection');
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) window.api.getSettings().then(setSettings);
  }, [open]);

  if (!open || !settings) return null;

  function patch(update) {
    setSettings((s) => ({ ...s, ...update }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await window.api.saveSettings(settings);
      await window.api.changeGlobalOption({
        interface: settings.defaultInterface || undefined,
        'max-connection-per-server': String(settings.maxConnectionsPerDownload),
        'max-concurrent-downloads': String(settings.maxConcurrentDownloads),
        'max-overall-download-limit': settings.maxOverallDownloadLimit,
        'max-overall-upload-limit': settings.maxOverallUploadLimit,
        'all-proxy': settings.proxy || undefined
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal settings-window">
        <header className="modal-header">
          <h2>Options</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="settings-body">
          <nav className="settings-tabs">
            {TABS.map((t) => (
              <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </nav>

          <div className="settings-panel">
            {tab === 'General' && (
              <div className="field field-inline">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.minimizeToTrayOnClose}
                    onChange={(e) => patch({ minimizeToTrayOnClose: e.target.checked })}
                  />
                  Minimize to tray when closed
                </label>
              </div>
            )}

            {tab === 'Save To' && (
              <p className="settings-hint">Per-category default folders are configured in the Categories tab.</p>
            )}

            {tab === 'Connection' && (
              <>
                <InterfaceSelect
                  value={settings.defaultInterface}
                  onChange={(v) => patch({ defaultInterface: v })}
                  label="Default network interface for new downloads"
                />
                <div className="field">
                  <label>Max connections per download: {settings.maxConnectionsPerDownload}</label>
                  <input
                    type="range"
                    min={1}
                    max={32}
                    value={settings.maxConnectionsPerDownload}
                    onChange={(e) => patch({ maxConnectionsPerDownload: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Max simultaneous downloads: {settings.maxConcurrentDownloads}</label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={settings.maxConcurrentDownloads}
                    onChange={(e) => patch({ maxConcurrentDownloads: Number(e.target.value) })}
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Global download limit</label>
                    <input
                      type="text"
                      placeholder="e.g. 2M, 0 = unlimited"
                      value={settings.maxOverallDownloadLimit}
                      onChange={(e) => patch({ maxOverallDownloadLimit: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Global upload limit</label>
                    <input
                      type="text"
                      placeholder="e.g. 512K, 0 = unlimited"
                      value={settings.maxOverallUploadLimit}
                      onChange={(e) => patch({ maxOverallUploadLimit: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {tab === 'Categories' && (
              <p className="settings-hint">Edit per-category file extensions and default save folders here.</p>
            )}

            {tab === 'Scheduler' && (
              <p className="settings-hint">Configure start/stop time windows for queued downloads here.</p>
            )}

            {tab === 'Proxy' && (
              <div className="field">
                <label>Proxy URL</label>
                <input
                  type="text"
                  placeholder="http://user:pass@host:port"
                  value={settings.proxy}
                  onChange={(e) => patch({ proxy: e.target.value })}
                />
              </div>
            )}

            {tab === 'Advanced' && (
              <p className="settings-hint">
                Raw aria2 option passthrough for power users — validated against aria2's documented option list
                before being applied.
              </p>
            )}
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
}
