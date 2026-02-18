import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Section from '../shared/Section';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';

export default function LocationComparison({ locationStats, highlightLocation, highlightBrand }) {
  if (!locationStats || !locationStats.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title="Registrazioni per location">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={locationStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="location" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="totalRegistrations" name="Registrazioni" radius={[6, 6, 0, 0]} maxBarSize={50}>
              {locationStats.map((loc, i) => (
                <Cell
                  key={i}
                  fill={loc.location === highlightLocation ? "#8b5cf6" : COLORS[i % COLORS.length]}
                  opacity={highlightLocation && loc.location !== highlightLocation ? 0.4 : 1}
                />
              ))}
            </Bar>
            <Bar dataKey="totalAttended" name="Presenze" radius={[6, 6, 0, 0]} maxBarSize={50} fill="#334155" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {locationStats.map((loc, i) => {
          const isHL = loc.location === highlightLocation;
          return (
            <div key={loc.location} style={{
              background: isHL ? "rgba(139,92,246,0.08)" : "#1e293b",
              borderRadius: 12, padding: 16,
              border: isHL ? "2px solid #8b5cf6" : "1px solid #334155",
              position: "relative",
            }}>
              {isHL && highlightBrand && (
                <div style={{
                  position: "absolute", top: -8, right: 12, background: "#8b5cf6",
                  borderRadius: 4, padding: "1px 8px", fontSize: 9, color: "#fff", fontWeight: 600,
                }}>
                  {highlightBrand}
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: isHL ? "#8b5cf6" : COLORS[i % COLORS.length], marginBottom: 10 }}>
                {loc.location}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ color: "#64748b" }}>Eventi</div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{loc.brandCount}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Registrazioni</div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{loc.totalRegistrations}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Presenze</div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{loc.totalAttended}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Conversione</div>
                  <div style={{ color: "#10b981", fontWeight: 600 }}>{loc.avgConversion}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
