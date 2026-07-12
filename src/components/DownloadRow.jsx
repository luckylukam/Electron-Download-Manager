import React from 'react';
import SpeedSparkline from './SpeedSparkline.jsx';
import { formatBytes, formatSpeed, formatTimeLeft, formatDate } from '../utils/format.js';

const STATUS_LABEL = {
  active: 'Downloading',
  waiting: 'Queued',
  paused: 'Paused',
  complete: 'Finished',
  error: 'Error',
  removed: 'Removed'
};

export default function DownloadRow({ download, selected, onSelect }) {
  const pct = download.size > 0 ? Math.round((download.completed / download.size) * 100) : 0;

  return (
    <tr className={selected ? 'row-selected' : ''} onClick={() => onSelect(download.gid)}>
      <td className="col-name">
        <div className="name-cell">
          <span className={`status-dot status-${download.status}`} />
          <div>
            <div className="name-text">{download.name}</div>
            {download.status === 'active' && (
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            )}
            {download.networkInterface && <div className="iface-tag">via {download.networkInterface}</div>}
          </div>
        </div>
      </td>
      <td className="mono">{formatBytes(download.size)}</td>
      <td>
        <span className={`status-pill status-pill-${download.status}`}>{STATUS_LABEL[download.status] || download.status}</span>
      </td>
      <td className="mono">{download.status === 'active' ? formatTimeLeft(download.timeLeftSec) : '—'}</td>
      <td>
        <div className="speed-cell">
          <span className="mono">{formatSpeed(download.speed)}</span>
          {download.status === 'active' && <SpeedSparkline data={download.speedHistory} />}
        </div>
      </td>
      <td className="mono">{formatDate(download.lastTry)}</td>
      <td className="col-desc" title={download.url}>
        {download.description || download.url}
      </td>
    </tr>
  );
}
