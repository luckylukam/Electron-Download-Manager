import React from 'react';
import { useDownloadsStore } from '../store/downloadsStore.js';

export default function Toolbar({ onResume, onStop, onDelete, onDeleteCompleted, onStartQueue, onStopQueue }) {
  const openAddDownloadDialog = useDownloadsStore((s) => s.openAddDownloadDialog);
  const openSettings = useDownloadsStore((s) => s.openSettings);
  const selectedGid = useDownloadsStore((s) => s.selectedGid);

  const buttons = [
    { label: 'Add URL', onClick: openAddDownloadDialog, primary: true },
    { label: 'Resume', onClick: () => onResume(selectedGid), disabled: !selectedGid },
    { label: 'Stop', onClick: () => onStop(selectedGid), disabled: !selectedGid },
    { label: 'Delete', onClick: () => onDelete(selectedGid), disabled: !selectedGid },
    { label: 'Delete Completed', onClick: onDeleteCompleted },
    { label: 'divider' },
    { label: 'Start Queue', onClick: onStartQueue },
    { label: 'Stop Queue', onClick: onStopQueue },
    { label: 'divider' },
    { label: 'Scheduler', onClick: openSettings },
    { label: 'Options', onClick: openSettings }
  ];

  return (
    <div className="toolbar">
      {buttons.map((b, i) =>
        b.label === 'divider' ? (
          <div key={`div-${i}`} className="toolbar-divider" />
        ) : (
          <button
            key={b.label}
            className={`toolbar-btn ${b.primary ? 'toolbar-btn-primary' : ''}`}
            onClick={b.onClick}
            disabled={b.disabled}
          >
            {b.label}
          </button>
        )
      )}
    </div>
  );
}
