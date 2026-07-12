import { create } from 'zustand';

const CATEGORY_EXTENSIONS = {
  Videos: ['mp4', 'mkv', 'avi', 'mov', 'webm'],
  Music: ['mp3', 'flac', 'wav', 'aac', 'ogg'],
  Documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
  Compressed: ['zip', 'rar', '7z', 'tar', 'gz'],
  Programs: ['exe', 'msi']
};

function categoryForFilename(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  for (const [category, exts] of Object.entries(CATEGORY_EXTENSIONS)) {
    if (exts.includes(ext)) return category;
  }
  return 'Other';
}

/** Maps a raw aria2 tellStatus-style object into the row shape the table renders. */
function normalizeDownload(raw, extra = {}) {
  const file = raw.files?.[0];
  const name = extra.description || file?.path?.split(/[\\/]/).pop() || raw.gid;
  const total = Number(raw.totalLength || 0);
  const completed = Number(raw.completedLength || 0);
  const speed = Number(raw.downloadSpeed || 0);
  const remaining = total - completed;
  const timeLeftSec = speed > 0 ? Math.round(remaining / speed) : null;

  return {
    gid: raw.gid,
    name,
    size: total,
    completed,
    status: raw.status, // 'active' | 'waiting' | 'paused' | 'complete' | 'error' | 'removed'
    speed,
    timeLeftSec,
    lastTry: extra.lastTry || new Date().toISOString(),
    description: extra.description || '',
    url: raw.files?.[0]?.uris?.[0]?.uri || '',
    category: extra.category || categoryForFilename(name),
    networkInterface: extra.networkInterface || null,
    speedHistory: extra.speedHistory || []
  };
}

export const useDownloadsStore = create((set, get) => ({
  downloads: {}, // gid -> normalized download
  selectedGid: null,
  activeCategory: 'All',
  theme: 'dark',
  addDownloadDialogOpen: false,
  settingsOpen: false,

  setTheme: (theme) => set({ theme }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setSelectedGid: (selectedGid) => set({ selectedGid }),
  openAddDownloadDialog: () => set({ addDownloadDialogOpen: true }),
  closeAddDownloadDialog: () => set({ addDownloadDialogOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  upsertFromStatus: (raw, extra) =>
    set((state) => {
      const prevExtra = state.downloads[raw.gid] || {};
      const speed = Number(raw.downloadSpeed || 0);
      const speedHistory = [...(prevExtra.speedHistory || []), speed].slice(-40);
      const normalized = normalizeDownload(raw, { ...prevExtra, ...extra, speedHistory });
      return { downloads: { ...state.downloads, [raw.gid]: normalized } };
    }),

  bulkUpsert: (rawList) =>
    set((state) => {
      const next = { ...state.downloads };
      for (const raw of rawList) {
        const prevExtra = next[raw.gid] || {};
        const speed = Number(raw.downloadSpeed || 0);
        const speedHistory = [...(prevExtra.speedHistory || []), speed].slice(-40);
        next[raw.gid] = normalizeDownload(raw, { ...prevExtra, speedHistory });
      }
      return { downloads: next };
    }),

  removeDownload: (gid) =>
    set((state) => {
      const next = { ...state.downloads };
      delete next[gid];
      return { downloads: next };
    }),

  categoryCounts: () => {
    const downloads = Object.values(get().downloads);
    const counts = {
      All: downloads.length,
      Downloading: downloads.filter((d) => d.status === 'active').length,
      Finished: downloads.filter((d) => d.status === 'complete').length,
      Unfinished: downloads.filter((d) => ['paused', 'waiting', 'error'].includes(d.status)).length
    };
    for (const cat of Object.keys(CATEGORY_EXTENSIONS)) {
      counts[cat] = downloads.filter((d) => d.category === cat).length;
    }
    counts.Other = downloads.filter((d) => d.category === 'Other').length;
    return counts;
  }
}));

export { categoryForFilename };
