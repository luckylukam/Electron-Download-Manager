import React from 'react';

export default function SpeedSparkline({ data = [], width = 64, height = 20 }) {
  if (!data.length) return <svg width={width} height={height} />;

  const max = Math.max(...data, 1);
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`).join(' ');

  return (
    <svg width={width} height={height} className="sparkline" viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
