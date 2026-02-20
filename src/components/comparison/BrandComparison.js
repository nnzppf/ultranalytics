import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Section from '../shared/Section';
import { DeltaBadge, GenreBadge } from '../shared/Badge';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';
import { GENRE_LABELS } from '../../config/eventConfig';
import { colors, font, radius, presets, transition as tr } from '../../config/designTokens';

export default function BrandComparison({ brandStats, onSelectBrand, highlightBrand }) {
  if (!brandStats || !brandStats.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Bar chart */}
      <Section title="Registrazioni per brand">
        <ResponsiveContainer width="100%" height={Math.max(250, brandStats.length * 40)}>
          <BarChart data={brandStats} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
            <XAxis type="number" tick={{ fill: colors.text.muted, fontSize: 10 }} />
            <YAxis dataKey="brand" type="category" tick={{ fill: colors.text.primary, fontSize: font.size.xs }} width={140} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="totalRegistrations" name="Registrazioni" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {brandStats.map((b, i) => (
                <Cell
                  key={i}
                  fill={b.brand === highlightBrand ? colors.brand.purple : COLORS[i % COLORS.length]}
                  opacity={highlightBrand && b.brand !== highlightBrand ? 0.4 : 1}
                />
              ))}
            </Bar>
            <Bar dataKey="totalAttended" name="Presenze" radius={[0, 4, 4, 0]} maxBarSize={28} fill={colors.bg.elevated} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Cards - put highlighted brand first */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {[...brandStats]
          .sort((a, b) => {
            if (a.brand === highlightBrand) return -1;
            if (b.brand === highlightBrand) return 1;
            return b.totalRegistrations - a.totalRegistrations;
          })
          .map((b, i) => {
            const isHL = b.brand === highlightBrand;
            return (
              <div
                key={b.brand}
                onClick={() => onSelectBrand && onSelectBrand(b.brand)}
                style={{
                  background: isHL ? "rgba(139,92,246,0.08)" : colors.bg.card,
                  borderRadius: radius["2xl"], padding: 16,
                  border: isHL ? `2px solid ${colors.brand.purple}` : `1px solid ${colors.border.default}`,
                  cursor: onSelectBrand ? "pointer" : "default",
                  transition: tr.normal,
                }}
                onMouseEnter={e => { if (onSelectBrand) e.currentTarget.style.borderColor = colors.brand.purple; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isHL ? colors.brand.purple : colors.border.default; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: font.weight.bold, color: isHL ? colors.brand.purple : colors.text.primary }}>{b.brand}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {b.genres.map(g => (
                        <GenreBadge key={g} genre={GENRE_LABELS[g]?.label || g} color={GENRE_LABELS[g]?.color} />
                      ))}
                    </div>
                  </div>
                  <div style={{
                    background: colors.bg.page, borderRadius: radius.lg, padding: "4px 10px",
                    fontSize: font.size.xs, color: colors.text.muted,
                  }}>
                    {b.editionCount} ediz.
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                  <div>
                    <div style={presets.statLabel}>Media/ediz.</div>
                    <div style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary }}>{b.avgPerEdition}</div>
                  </div>
                  <div>
                    <div style={presets.statLabel}>Conversione</div>
                    <div style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.status.success }}>{b.avgConversion}%</div>
                  </div>
                  <div>
                    <div style={presets.statLabel}>Crescita</div>
                    <div style={{ fontSize: font.size.lg, fontWeight: font.weight.bold }}>
                      {b.growth !== null ? <DeltaBadge value={b.growth} /> : <span style={{ color: colors.text.disabled }}>-</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
