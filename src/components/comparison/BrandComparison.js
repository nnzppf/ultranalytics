import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Section from '../shared/Section';
import { DeltaBadge, GenreBadge } from '../shared/Badge';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';
import { GENRE_LABELS } from '../../config/eventConfig';

export default function BrandComparison({ brandStats, onSelectBrand }) {
  if (!brandStats || !brandStats.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Bar chart */}
      <Section title="Registrazioni per brand">
        <ResponsiveContainer width="100%" height={Math.max(250, brandStats.length * 40)}>
          <BarChart data={brandStats} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis dataKey="brand" type="category" tick={{ fill: "#f1f5f9", fontSize: 11 }} width={140} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="totalRegistrations" name="Registrazioni" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {brandStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
            <Bar dataKey="totalAttended" name="Presenze" radius={[0, 4, 4, 0]} maxBarSize={28} fill="#334155" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {brandStats.map((b, i) => (
          <div
            key={b.brand}
            onClick={() => onSelectBrand && onSelectBrand(b.brand)}
            style={{
              background: "#1e293b", borderRadius: 12, padding: 16,
              border: "1px solid #334155", cursor: onSelectBrand ? "pointer" : "default",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={e => { if (onSelectBrand) e.currentTarget.style.borderColor = "#8b5cf6"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{b.brand}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {b.genres.map(g => (
                    <GenreBadge key={g} genre={GENRE_LABELS[g]?.label || g} color={GENRE_LABELS[g]?.color} />
                  ))}
                </div>
              </div>
              <div style={{
                background: "#0f172a", borderRadius: 8, padding: "4px 10px",
                fontSize: 11, color: "#94a3b8",
              }}>
                {b.editionCount} ediz.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Media/ediz.</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{b.avgPerEdition}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Conversione</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>{b.avgConversion}%</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Crescita</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {b.growth !== null ? <DeltaBadge value={b.growth} /> : <span style={{ color: "#64748b" }}>-</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
