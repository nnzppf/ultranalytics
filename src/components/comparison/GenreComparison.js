import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import Section from '../shared/Section';
import { GENRE_LABELS } from '../../config/eventConfig';
import { TOOLTIP_STYLE } from '../../config/constants';

export default function GenreComparison({ genreStats, onSelectGenre, highlightGenres, highlightBrand }) {
  if (!genreStats || !genreStats.length) return null;

  const chartData = genreStats.map(g => ({
    ...g,
    label: GENRE_LABELS[g.genre]?.label || g.genre,
    color: GENRE_LABELS[g.genre]?.color || "#8b5cf6",
    isHighlighted: highlightGenres?.includes(g.genre),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Registrazioni per genere */}
        <Section title="Registrazioni per genere">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="totalRegistrations" name="Registrazioni" radius={[6, 6, 0, 0]} maxBarSize={50}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} opacity={highlightGenres?.length > 0 && !d.isHighlighted ? 0.3 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Distribuzione */}
        <Section title="Distribuzione registrazioni">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="totalRegistrations"
                nameKey="label"
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={95}
                label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} opacity={highlightGenres?.length > 0 && !d.isHighlighted ? 0.3 : 1} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Genre cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {chartData.map(g => {
          const isHL = g.isHighlighted;
          return (
            <div
              key={g.genre}
              onClick={() => onSelectGenre && onSelectGenre(g.genre)}
              style={{
                background: isHL ? "rgba(139,92,246,0.08)" : "#1e293b",
                borderRadius: 12, padding: 16,
                border: isHL ? `2px solid ${g.color}` : `2px solid ${g.color}33`,
                cursor: onSelectGenre ? "pointer" : "default",
                transition: "border-color 0.2s",
                position: "relative",
              }}
              onMouseEnter={e => { if (onSelectGenre) e.currentTarget.style.borderColor = g.color; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isHL ? g.color : `${g.color}33`; }}
            >
              {isHL && highlightBrand && (
                <div style={{
                  position: "absolute", top: -8, right: 12, background: "#8b5cf6",
                  borderRadius: 4, padding: "1px 8px", fontSize: 9, color: "#fff", fontWeight: 600,
                }}>
                  {highlightBrand}
                </div>
              )}
              <div style={{ fontSize: 16, fontWeight: 700, color: g.color, marginBottom: 8 }}>
                {g.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ color: "#64748b" }}>Brand</div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{g.brandCount}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Registrazioni</div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{g.totalRegistrations}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Media/brand</div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{g.avgPerBrand}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Conversione</div>
                  <div style={{ color: "#10b981", fontWeight: 600 }}>{g.avgConversion}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
