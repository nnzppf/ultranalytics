import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import Section from '../shared/Section';
import { GENRE_LABELS } from '../../config/eventConfig';
import { TOOLTIP_STYLE } from '../../config/constants';
import { colors, font, radius, transition as tr, alpha } from '../../config/designTokens';

export default function GenreComparison({ genreStats, onSelectGenre, highlightGenres, highlightBrand, highlightBrandStats }) {
  if (!genreStats || !genreStats.length) return null;

  // When a brand is selected in the top bar, show brand-vs-genre comparison
  const hasBrandContext = highlightBrand && highlightBrandStats;

  const chartData = genreStats.map(g => ({
    ...g,
    label: GENRE_LABELS[g.genre]?.label || g.genre,
    color: GENRE_LABELS[g.genre]?.color || colors.brand.purple,
    isHighlighted: highlightGenres?.includes(g.genre),
  }));

  // Build comparison data: brand row + each genre's avg row
  const vsData = hasBrandContext ? [
    {
      name: highlightBrand,
      registrazioni: highlightBrandStats.avgPerEdition,
      conversione: highlightBrandStats.avgConversion,
      color: colors.brand.purple,
      isBrand: true,
    },
    ...chartData.map(g => ({
      name: g.label,
      registrazioni: g.avgPerBrand,
      conversione: g.avgConversion,
      color: g.color,
      isBrand: false,
      genre: g.genre,
    })),
  ] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* === BRAND CONTEXT MODE: brand vs genres === */}
      {hasBrandContext && (
        <>
          <div style={{
            background: alpha.brand[6], borderRadius: radius.xl, padding: "10px 16px",
            border: `1px solid ${alpha.brand[20]}`, fontSize: font.size.sm, color: colors.text.muted,
            marginBottom: 4,
          }}>
            Confronto <strong style={{ color: colors.brand.purple }}>{highlightBrand}</strong> (media per edizione) vs media per brand di ogni genere
          </div>

          <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Registrazioni medie */}
            <Section title="Media registrazioni / edizione">
              <ResponsiveContainer width="100%" height={Math.max(250, vsData.length * 45)}>
                <BarChart data={vsData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
                  <XAxis type="number" tick={{ fill: colors.text.muted, fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: colors.text.primary, fontSize: font.size.xs }} width={120} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="registrazioni" name="Media registrazioni" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {vsData.map((d, i) => (
                      <Cell key={i} fill={d.color} opacity={d.isBrand ? 1 : 0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Conversione */}
            <Section title="Conversione media">
              <ResponsiveContainer width="100%" height={Math.max(250, vsData.length * 45)}>
                <BarChart data={vsData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
                  <XAxis type="number" tick={{ fill: colors.text.muted, fontSize: 10 }} domain={[0, 100]} unit="%" />
                  <YAxis dataKey="name" type="category" tick={{ fill: colors.text.primary, fontSize: font.size.xs }} width={120} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
                  <Bar dataKey="conversione" name="Conversione" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {vsData.map((d, i) => (
                      <Cell key={i} fill={d.isBrand ? colors.brand.purple : colors.status.success} opacity={d.isBrand ? 1 : 0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>
        </>
      )}

      {/* === STANDARD MODE: genre totals === */}
      {!hasBrandContext && (
        <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Section title="Registrazioni per genere">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
                <XAxis dataKey="label" tick={{ fill: colors.text.muted, fontSize: font.size.xs }} />
                <YAxis tick={{ fill: colors.text.muted, fontSize: 10 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="totalRegistrations" name="Registrazioni" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} opacity={highlightGenres?.length > 0 && !d.isHighlighted ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>

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
      )}

      {/* Genre cards - always shown, clickable to drill into brand list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {chartData.map(g => {
          const isHL = g.isHighlighted;
          const brandDelta = hasBrandContext
            ? highlightBrandStats.avgPerEdition - g.avgPerBrand
            : null;

          return (
            <div
              key={g.genre}
              onClick={() => onSelectGenre && onSelectGenre(g.genre)}
              style={{
                background: isHL ? alpha.brand[8] : colors.bg.card,
                borderRadius: radius["2xl"], padding: 16,
                border: isHL ? `2px solid ${g.color}` : `2px solid ${g.color}33`,
                cursor: onSelectGenre ? "pointer" : "default",
                transition: tr.normal,
                position: "relative",
              }}
              onMouseEnter={e => { if (onSelectGenre) e.currentTarget.style.borderColor = g.color; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isHL ? g.color : `${g.color}33`; }}
            >
              {isHL && highlightBrand && (
                <div style={{
                  position: "absolute", top: -8, right: 12, background: colors.brand.purple,
                  borderRadius: radius.sm, padding: "1px 8px", fontSize: font.size.xs, color: colors.text.inverse, fontWeight: font.weight.semibold,
                }}>
                  {highlightBrand}
                </div>
              )}
              <div style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: g.color, marginBottom: 8 }}>
                {g.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: font.size.sm }}>
                <div>
                  <div style={{ color: colors.text.disabled }}>Brand</div>
                  <div style={{ color: colors.text.primary, fontWeight: font.weight.semibold }}>{g.brandCount}</div>
                </div>
                <div>
                  <div style={{ color: colors.text.disabled }}>Media/brand</div>
                  <div style={{ color: colors.text.primary, fontWeight: font.weight.semibold }}>{g.avgPerBrand}</div>
                </div>
                <div>
                  <div style={{ color: colors.text.disabled }}>Conversione</div>
                  <div style={{ color: colors.status.success, fontWeight: font.weight.semibold }}>{g.avgConversion}%</div>
                </div>
                {brandDelta !== null && (
                  <div>
                    <div style={{ color: colors.text.disabled }}>vs {highlightBrand}</div>
                    <div style={{
                      fontWeight: font.weight.semibold,
                      color: brandDelta > 0 ? colors.status.success : brandDelta < 0 ? colors.status.error : colors.text.muted,
                    }}>
                      {brandDelta > 0 ? "+" : ""}{brandDelta}
                    </div>
                  </div>
                )}
              </div>
              {onSelectGenre && (
                <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 8, textAlign: "right" }}>
                  {hasBrandContext
                    ? `Vedi ${highlightBrand} vs brand ${g.label.toLowerCase()} →`
                    : `Vedi brand ${g.label.toLowerCase()} →`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
