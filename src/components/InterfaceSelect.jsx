import React from 'react';
import { useNetworkInterfaces } from '../hooks/useNetworkInterfaces.js';

/**
 * The dropdown IDM doesn't have: lets the user bind a download (or the
 * global default) to a specific network adapter. Value is either null
 * ("use default") or the adapter name, which is passed straight through
 * as aria2's --interface option (see docs/ARCHITECTURE.md §2).
 */
export default function InterfaceSelect({ value, onChange, allowDefaultOption = true, label = 'Network interface' }) {
  const { interfaces, loading, error, refresh } = useNetworkInterfaces();
  const selected = interfaces.find((i) => i.name === value);

  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor="iface-select">{label}</label>
        <button type="button" className="link-btn" onClick={refresh} disabled={loading} title="Refresh adapter list">
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <select
        id="iface-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
      >
        {allowDefaultOption && <option value="">Use default</option>}
        {interfaces.map((iface) => (
          <option key={iface.name} value={iface.name}>
            {iface.name} — {iface.ip || iface.ipv6 || 'no address'} ({iface.status})
          </option>
        ))}
      </select>

      {error && <p className="field-hint field-hint-error">{error}</p>}

      {value && selected && !selected.isUp && (
        <p className="field-hint field-hint-warn">
          ⚠ "{selected.name}" is currently {selected.status.toLowerCase()}. Downloads bound to it will fail until it
          reconnects.
        </p>
      )}

      {value && selected && (
        <p className="field-hint">
          Bound to <span className="mono">{selected.ip || selected.ipv6}</span>
        </p>
      )}
    </div>
  );
}
