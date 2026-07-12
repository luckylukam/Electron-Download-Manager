import React from 'react';
import { useDownloadsStore } from '../store/downloadsStore.js';

const ITEMS = [
  { key: 'All', label: 'All Downloads' },
  { key: 'Downloading', label: 'Downloading' },
  { key: 'Finished', label: 'Finished' },
  { key: 'Unfinished', label: 'Unfinished' },
  { key: 'divider' },
  { key: 'Videos', label: 'Videos' },
  { key: 'Music', label: 'Music' },
  { key: 'Compressed', label: 'Compressed' },
  { key: 'Documents', label: 'Documents' },
  { key: 'Programs', label: 'Programs' },
  { key: 'Other', label: 'Other' }
];

export default function Sidebar() {
  const activeCategory = useDownloadsStore((s) => s.activeCategory);
  const setActiveCategory = useDownloadsStore((s) => s.setActiveCategory);
  const counts = useDownloadsStore((s) => s.categoryCounts());

  return (
    <nav className="sidebar">
      {ITEMS.map((item, idx) =>
        item.key === 'divider' ? (
          <div key={`div-${idx}`} className="sidebar-divider" />
        ) : (
          <button
            key={item.key}
            className={`sidebar-item ${activeCategory === item.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(item.key)}
          >
            <span>{item.label}</span>
            <span className="badge">{counts[item.key] ?? 0}</span>
          </button>
        )
      )}
    </nav>
  );
}
