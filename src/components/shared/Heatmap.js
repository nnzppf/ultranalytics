import { useMemo } from 'react';
import { HOURS, DAYS_SHORT } from '../../config/constants';

export default function Heatmap({ heatmapGrid }) {
  const max = useMemo(() => {
    let mx = 0;
    DAYS_SHORT.forEach(d => {
      HOURS.forEach(h => {
        if (heatmapGrid[d] && heatmapGrid[d][h] > mx) mx = heatmapGrid[d][h];
      });
    });
    return mx || 1;
  }, [heatmapGrid]);

  const color = v => {
    if (!v) return "#1a1a2e";
    const t = v / max;
    return `rgb(${Math.round(30 + t * 109)},${Math.round(20 + t * 52)},${Math.round(60 + t * 186)})`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "44px repeat(24,1fr)", gap: 2, minWidth: 580 }}>
        <div />
        {HOURS.map(h => (
          <div key={h} style={{ textAlign: "center", fontSize: 9, color: "#64748b" }}>
            {String(h).padStart(2, "0")}
          </div>
        ))}
        {DAYS_SHORT.map((day, di) => [
          <div key={`l${di}`} style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center" }}>{day}</div>,
          ...HOURS.map(h => (
            <div
              key={`${di}-${h}`}
              title={`${day} ${String(h).padStart(2, "0")}:00 — ${(heatmapGrid[day] && heatmapGrid[day][h]) || 0} registrazioni`}
              style={{
                backgroundColor: color((heatmapGrid[day] && heatmapGrid[day][h]) || 0),
                borderRadius: 3, minHeight: 20, aspectRatio: "1",
                transition: "transform 0.1s", cursor: "crosshair",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.35)"; e.currentTarget.style.zIndex = 10; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = 0; }}
            />
          ))
        ])}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
        <span style={{ fontSize: 10, color: "#64748b" }}>Meno</span>
        {[0, .25, .5, .75, 1].map((v, i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: 3, backgroundColor: color(v * max) }} />
        ))}
        <span style={{ fontSize: 10, color: "#64748b" }}>Più</span>
      </div>
    </div>
  );
}
