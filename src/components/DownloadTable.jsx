import React, { useMemo, useState } from 'react';
import { useDownloadsStore } from '../store/downloadsStore.js';
import DownloadRow from './DownloadRow.jsx';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'status', label: 'Status' },
  { key: 'timeLeftSec', label: 'Time Left' },
  { key: 'speed', label: 'Speed' },
  { key: 'lastTry', label: 'Last Try Date' },
  { key: 'description', label: 'Description / URL' }
];

const CATEGORY_FILTERS = {
  All: () => true,
  Downloading: (d) => d.status === 'active',
  Finished: (d) => d.status === 'complete',
  Unfinished: (d) => ['paused', 'waiting', 'error'].includes(d.status),
  Videos: (d) => d.category === 'Videos',
  Music: (d) => d.category === 'Music',
  Compressed: (d) => d.category === 'Compressed',
  Documents: (d) => d.category === 'Documents',
  Programs: (d) => d.category === 'Programs',
  Other: (d) => d.category === 'Other'
};

export default function DownloadTable() {
  const downloads = useDownloadsStore((s) => s.downloads);
  const activeCategory = useDownloadsStore((s) => s.activeCategory);
  const selectedGid = useDownloadsStore((s) => s.selectedGid);
  const setSelectedGid = useDownloadsStore((s) => s.setSelectedGid);
  const [sortKey, setSortKey] = useState('lastTry');
  const [sortDir, setSortDir] = useState('desc');

  const rows = useMemo(() => {
    const filterFn = CATEGORY_FILTERS[activeCategory] || CATEGORY_FILTERS.All;
    const list = Object.values(downloads).filter(filterFn);
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [downloads, activeCategory, sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="download-table-wrap">
      <table className="download-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} onClick={() => toggleSort(col.key)}>
                {col.label}
                {sortKey === col.key && <span className="sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="empty-state">
                No downloads yet. Click "Add URL" to start one.
              </td>
            </tr>
          )}
          {rows.map((d) => (
            <DownloadRow key={d.gid} download={d} selected={d.gid === selectedGid} onSelect={setSelectedGid} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
