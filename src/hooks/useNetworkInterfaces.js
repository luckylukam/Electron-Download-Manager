import { useEffect, useState, useCallback } from 'react';

/**
 * Loads the system's network adapters via window.api.getInterfaces()
 * (electron/network-interfaces.js). Used by both the Add Download dialog
 * and Settings > Connection, so the fetch + refresh logic lives here once.
 */
export function useNetworkInterfaces() {
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.api.getInterfaces();
      setInterfaces(list);
    } catch (err) {
      setError(err.message || 'Failed to enumerate network interfaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { interfaces, loading, error, refresh };
}
