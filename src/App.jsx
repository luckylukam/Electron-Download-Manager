import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Toolbar from './components/Toolbar.jsx';
import DownloadTable from './components/DownloadTable.jsx';
import StatusBar from './components/StatusBar.jsx';
import AddDownloadDialog from './components/AddDownloadDialog.jsx';
import SettingsWindow from './components/SettingsWindow.jsx';
import { useDownloadsStore } from './store/downloadsStore.js';
import { useAria2 } from './hooks/useAria2.js';
import './styles/app.css';

export default function App() {
  const theme = useDownloadsStore((s) => s.theme);
  const setTheme = useDownloadsStore((s) => s.setTheme);
  const addDownloadDialogOpen = useDownloadsStore((s) => s.addDownloadDialogOpen);
  const closeAddDownloadDialog = useDownloadsStore((s) => s.closeAddDownloadDialog);
  const settingsOpen = useDownloadsStore((s) => s.settingsOpen);
  const closeSettings = useDownloadsStore((s) => s.closeSettings);

  const aria2 = useAria2();

  useEffect(() => {
    window.api.getSettings().then((s) => setTheme(s.theme || 'dark'));
  }, [setTheme]);

  async function handleAddDownload(payload) {
    const settings = await window.api.getSettings();
    await window.api.addDownload({
      ...payload,
      maxConnections: payload.maxConnections || settings.maxConnectionsPerDownload
    });
  }

  async function handleDeleteCompleted() {
    const { stopped } = await window.api.listDownloads();
    await Promise.all(stopped.filter((d) => d.status === 'complete').map((d) => window.api.removeResult(d.gid)));
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="app-titlebar">
        <span className="app-name">AriaGet</span>
        <button
          className="theme-toggle"
          onClick={() => {
            const next = theme === 'dark' ? 'light' : 'dark';
            setTheme(next);
            window.api.saveSettings({ theme: next });
          }}
        >
          {theme === 'dark' ? '☀ Light' : '● Dark'}
        </button>
      </header>

      <Toolbar
        onResume={aria2.resume}
        onStop={aria2.pause}
        onDelete={aria2.remove}
        onDeleteCompleted={handleDeleteCompleted}
        onStartQueue={aria2.resumeAll}
        onStopQueue={aria2.pauseAll}
      />

      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <DownloadTable />
        </main>
      </div>

      <StatusBar />

      <AddDownloadDialog open={addDownloadDialogOpen} onClose={closeAddDownloadDialog} onSubmit={handleAddDownload} />
      <SettingsWindow open={settingsOpen} onClose={closeSettings} />
    </div>
  );
}
