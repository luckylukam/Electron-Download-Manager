import React, { useMemo, useState } from 'react';
import { useDownloadsStore } from '../store/downloadsStore.js';
import { formatSpeed } from '../utils/format.js';

export default function StatusBar() {
  const downloads = useDownloadsStore((s) => s.downloads);
  const [limitEnabled, setLimitEnabled] = useState(false);

  const { activeCount, totalSpeed } = useMemo(() => {
    const list = Object.values(downloads);
    const active = list.filter((d) => d.status === 'active');
    return {
      activeCount: active.length,
      totalSpeed: active.reduce((sum, d) => sum + d.speed, 0)
    };
  }, [downloads]);

  async function toggleLimit() {
    const next = !limitEnabled;
    setLimitEnabled(next);
    await window.api.changeGlobalOption({
      'max-overall-download-limit': next ? '1M' : '0'
    });
  }

  return (
    <div className="status-bar">
      <span>{activeCount} active</span>
      <span className="status-sep">•</span>
      <span className="mono">{formatSpeed(totalSpeed)}</span>
      <span className="status-spacer" />
      <label className="status-toggle">
        <input type="checkbox" checked={limitEnabled} onChange={toggleLimit} />
        Limit total speed
      </label>
    </div>
  );
}
