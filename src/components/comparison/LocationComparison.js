import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Section from '../shared/Section';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';
import { colors, font, radius } from '../../config/designTokens';

export default function LocationComparison({ locationStats, highlightLocation, highlightBrand }) {
  if (!locationStats || !locationStats.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title="Registrazioni per location">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={locationStats}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
            <XAxis dataKey="location" tick={{ fill: colors.text.muted, fontSize: font.size.xs }} />
            <YAxis tick={{ fill: colors.text.muted, fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="totalRegistrations" name="Registrazioni" radius={[6, 6, 0, 0]} maxBarSize={50}>
              {locationStats.map((loc, i) => (
                <Cell
                  key={i}
                  fill={loc.location === highlightLocation ? colors.brand.purple : COLORS[i % COLORS.length]}
                  opacity={highlightLocation && loc.location !== highlightLocation ? 0.4 : 1}
                />
              ))}
            </Bar>
            <Bar dataKey="totalAttended" name="Presenze" radius={[6, 6, 0, 0]} maxBarSize={50} fill={colors.bg.elevated} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {locationStats.map((loc, i) => {
          const isHL = loc.location === highlightLocation;
          return (
            <div key={loc.location} style={{
              background: isHL ? "rgba(139,92,246,0.08)" : colors.bg.card,
              borderRadius: radius["2xl"], padding: 16,
              border: isHL ? `2px solid ${colors.brand.purple}` : `1px solid ${colors.border.default}`,
              position: "relative",
            }}>
              {isHL && highlightBrand && (
                <div style={{
                  position: "absolute", top: -8, right: 12, background: colors.brand.purple,
                  borderRadius: radius.sm, padding: "1px 8px", fontSize: font.size.xs, color: colors.text.inverse, fontWeight: font.weight.semibold,
                }}>
                  {highlightBrand}
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: font.weight.bold, color: isHL ? colors.brand.purple : COLORS[i % COLORS.length], marginBottom: 10 }}>
                {loc.location}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: font.size.sm }}>
                <div>
                  <div style={{ color: colors.text.disabled }}>Eventi</div>
                  <div style={{ color: colors.text.primary, fontWeight: font.weight.semibold }}>{loc.brandCount}</div>
                </div>
                <div>
                  <div style={{ color: colors.text.disabled }}>Registrazioni</div>
                  <div style={{ color: colors.text.primary, fontWeight: font.weight.semibold }}>{loc.totalRegistrations}</div>
                </div>
                <div>
                  <div style={{ color: colors.text.disabled }}>Presenze</div>
                  <div style={{ color: colors.text.primary, fontWeight: font.weight.semibold }}>{loc.totalAttended}</div>
                </div>
                <div>
                  <div style={{ color: colors.text.disabled }}>Conversione</div>
                  <div style={{ color: colors.status.success, fontWeight: font.weight.semibold }}>{loc.avgConversion}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
