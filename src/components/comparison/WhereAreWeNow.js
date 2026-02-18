import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DeltaBadge } from '../shared/Badge';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';

export default function WhereAreWeNow({ comparisonData }) {
  if (!comparisonData) return null;

  const {
    brand, edition, eventDate, currentDaysBefore, currentRegistrations,
    comparisons, avgAtSamePoint, avgProjectedFinal,
    avgFinal, progressPercent, overlayData, allEditionLabels,
  } = comparisonData;

  const avgDelta = avgAtSamePoint > 0
    ? parseFloat((((currentRegistrations - avgAtSamePoint) / avgAtSamePoint) * 100).toFixed(1))
    : null;

  return (
    <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, border: "1px solid #334155" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            A che punto siamo
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
            {brand} <span style={{ color: "#8b5cf6" }}>{edition}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Data evento</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
            {eventDate ? eventDate.toLocaleDateString('it', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}
          </div>
          <div style={{
            display: "inline-block", marginTop: 4, padding: "2px 10px",
            borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: currentDaysBefore <= 1 ? "#ef4444" : currentDaysBefore <= 3 ? "#f59e0b" : "#334155",
            color: "#fff",
          }}>
            {currentDaysBefore === 0 ? "OGGI" : `-${currentDaysBefore} giorni`}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#0f172a", borderRadius: 10, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Registrazioni attuali</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#8b5cf6" }}>{currentRegistrations}</div>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 10, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Media allo stesso punto</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>{avgAtSamePoint}</div>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 10, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Rispetto alla media</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            <DeltaBadge value={avgDelta} />
          </div>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 10, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Proiezione finale</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>~{avgProjectedFinal}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
          <span>Progresso vs media finale ({avgFinal})</span>
          <span>{Math.min(progressPercent, 100)}%</span>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 6, height: 8, overflow: "hidden" }}>
          <div style={{
            width: `${Math.min(progressPercent, 100)}%`, height: "100%", borderRadius: 6,
            background: progressPercent >= 100 ? "#10b981" : "linear-gradient(90deg, #8b5cf6, #ec4899)",
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Comparison table */}
      {comparisons.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>
            Confronto edizioni precedenti
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", fontWeight: 500 }}>Edizione</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", fontWeight: 500 }}>A -{currentDaysBefore}gg</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", fontWeight: 500 }}>Delta</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", fontWeight: 500 }}>Finale</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", fontWeight: 500 }}>Conv.</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", fontWeight: 500 }}>Proiezione</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "8px", color: "#f1f5f9", fontWeight: 600 }}>{c.editionLabel}</td>
                    <td style={{ padding: "8px", color: "#f1f5f9", textAlign: "center" }}>{c.atSamePoint}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <DeltaBadge value={c.deltaPercent} />
                    </td>
                    <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{c.totalFinal}</td>
                    <td style={{ padding: "8px", color: "#94a3b8", textAlign: "center" }}>{c.finalConversion}%</td>
                    <td style={{ padding: "8px", color: "#10b981", textAlign: "center", fontWeight: 600 }}>
                      {c.projectedFinal || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overlay chart */}
      {overlayData.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>
            Curve cumulative registrazioni
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={overlayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              {currentDaysBefore > 0 && (
                <ReferenceLine
                  x={`-${currentDaysBefore}`}
                  stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={2}
                  label={{ value: "OGGI", fill: "#f59e0b", fontSize: 10, position: "top" }}
                />
              )}
              {allEditionLabels.map((label, i) => (
                <Area
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={i === 0 ? "#8b5cf6" : COLORS[i % COLORS.length]}
                  fill={i === 0 ? "rgba(139,92,246,0.15)" : "transparent"}
                  strokeWidth={i === 0 ? 3 : 1.5}
                  strokeDasharray={i === 0 ? "" : "5 5"}
                  dot={false}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
