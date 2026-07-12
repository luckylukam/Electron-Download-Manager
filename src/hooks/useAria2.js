import { useEffect, useRef } from 'react';
import { useDownloadsStore } from '../store/downloadsStore.js';

const POLL_INTERVAL_MS = 1000;

/**
 * Drives the downloads table: polls aria2.tellActive/Waiting/Stopped on an
 * interval (progress/speed change every tick, so push notifications alone
 * aren't enough) and also listens for aria2's push events for instant
 * start/complete/error feedback (toasts, category counts) between polls.
 */
export function useAria2() {
  const bulkUpsert = useDownloadsStore((s) => s.bulkUpsert);
  const removeDownload = useDownloadsStore((s) => s.removeDownload);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const { active, waiting, stopped } = await window.api.listDownloads();
        if (!cancelled) bulkUpsert([...active, ...waiting, ...stopped]);
      } catch (err) {
        console.error('[useAria2] poll failed', err);
      }
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    const unsubscribe = window.api.onDownloadEvent(({ method, params }) => {
      // params: [{ gid: '...' }]
      const gid = params?.[0]?.gid;
      if (!gid) return;
      if (method === 'aria2.onDownloadError') {
        window.api.getStatus(gid).then((raw) => bulkUpsert([raw])).catch(() => {});
      }
      // Other events (start/pause/stop/complete) are picked up by the next poll tick;
      // we avoid an extra tellStatus round-trip per event to keep RPC traffic low.
    });

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
      unsubscribe();
    };
  }, [bulkUpsert]);

  const actions = {
    pause: (gid) => window.api.pause(gid),
    resume: (gid) => window.api.resume(gid),
    pauseAll: () => window.api.pauseAll(),
    resumeAll: () => window.api.resumeAll(),
    remove: async (gid) => {
      await window.api.remove(gid);
      removeDownload(gid);
    }
  };

  return actions;
}
