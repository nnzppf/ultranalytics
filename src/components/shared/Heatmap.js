import { useMemo } from 'react';
import { HOURS, DAYS_SHORT } from '../../config/constants';
import { colors, font, radius } from '../../config/designTokens';

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

  // Teal → Emerald → Amber gradient for intensity
  const heatColor = v => {
    if (!v) return colors.heatmap.empty;
    const t = v / max;
    if (t < 0.5) {
      // Dark teal → Bright teal
      const s = t * 2;
      return `rgb(${Math.round(15 + s * 0)},${Math.round(60 + s * 88)},${Math.round(55 + s * 81)})`;
    }
    // Bright teal → Amber/Orange
    const s = (t - 0.5) * 2;
    return `rgb(${Math.round(15 + s * 230)},${Math.round(148 - s * 0)},${Math.round(136 - s * 125)})`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "44px repeat(24,1fr)", gap: 2, minWidth: 580 }}>
        <div />
        {HOURS.map(h => (
          <div key={h} style={{ textAlign: "center", fontSize: font.size.xs, color: colors.text.disabled }}>
            {String(h).padStart(2, "0")}
          </div>
        ))}
        {DAYS_SHORT.map((day, di) => [
          <div key={`l${di}`} style={{ fontSize: font.size.xs, color: colors.text.muted, display: "flex", alignItems: "center" }}>{day}</div>,
          ...HOURS.map(h => (
            <div
              key={`${di}-${h}`}
              title={`${day} ${String(h).padStart(2, "0")}:00 — ${(heatmapGrid[day] && heatmapGrid[day][h]) || 0} registrazioni`}
              style={{
                backgroundColor: heatColor((heatmapGrid[day] && heatmapGrid[day][h]) || 0),
                borderRadius: radius.sm, minHeight: 20, aspectRatio: "1",
                transition: "transform 0.1s", cursor: "crosshair",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.35)"; e.currentTarget.style.zIndex = 10; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = 0; }}
            />
          ))
        ])}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
        <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>Meno</span>
        {[0, .25, .5, .75, 1].map((v, i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: radius.sm, backgroundColor: heatColor(v * max) }} />
        ))}
        <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>Più</span>
      </div>
    </div>
  );
}
