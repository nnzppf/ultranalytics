import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Section from '../shared/Section';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';

export default function LocationComparison({ locationStats }) {
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
              {locationStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
            <Bar dataKey="totalAttended" name="Presenze" radius={[6, 6, 0, 0]} maxBarSize={50} fill="#334155" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {locationStats.map((loc, i) => (
          <div key={loc.location} style={{
            background: "#1e293b", borderRadius: 12, padding: 16,
            border: "1px solid #334155",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS[i % COLORS.length], marginBottom: 10 }}>
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
        ))}
      </div>
    </div>
  );
}
