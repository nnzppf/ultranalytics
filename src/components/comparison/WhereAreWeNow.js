import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DeltaBadge } from '../shared/Badge';
import ScaleToggle from '../shared/ScaleToggle';
import { TOOLTIP_STYLE } from '../../config/constants';
import { colors, font, radius, gradients, presets, alpha } from '../../config/designTokens';

// Cross-brand comparison view
function CrossBrandView({ comparisonData }) {
  const { brandA, brandB, statsA, aggA, aggB, overlayData, allEditionLabels, allStats } = comparisonData;
  const [logScale, setLogScale] = useState(false);
  const [hiddenLines, setHiddenLines] = useState(new Set());
  const toggleLine = (label) => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const deltaReg = aggA.avgPerEdition - aggB.avgPerEdition;
  const deltaConv = parseFloat((aggA.avgConversion - aggB.avgConversion).toFixed(1));

  // Table data: all editions of both brands
  const tableData = allStats
    .sort((a, b) => (a.eventDate || 0) - (b.eventDate || 0))
    .map(s => ({
      ...s,
      isBrandA: s.brand === brandA,
    }));

  return (
    <div style={{ ...presets.card, borderRadius: radius["4xl"], padding: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...presets.sectionLabel, marginBottom: 4 }}>
          Confronto brand
        </div>
        <div style={{ fontSize: font.size["2xl"], fontWeight: font.weight.bold, color: colors.text.primary }}>
          <span style={{ color: colors.brand.purple }}>{brandA}</span>
          <span style={{ color: colors.text.disabled, margin: "0 8px", fontSize: font.size.md }}>vs</span>
          <span style={{ color: colors.brand.pink }}>{brandB}</span>
        </div>
      </div>

      {/* KPI comparison */}
      <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 20 }}>
        {/* Brand A stats */}
        <div style={{ background: alpha.brand[8], borderRadius: radius["2xl"], padding: 16, border: `1px solid ${alpha.brand[30]}` }}>
          <div style={{ fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.brand.purple, marginBottom: 10 }}>{brandA}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={presets.statLabel}>Edizioni</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.text.primary }}>{aggA.editionCount}</div>
            </div>
            <div>
              <div style={presets.statLabel}>Totale reg.</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.text.primary }}>{aggA.totalRegistrations}</div>
            </div>
            <div>
              <div style={presets.statLabel}>Media/ediz.</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.brand.purple }}>{aggA.avgPerEdition}</div>
            </div>
            <div>
              <div style={presets.statLabel}>Conversione</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.status.success }}>{aggA.avgConversion}%</div>
            </div>
          </div>
        </div>

        {/* Delta center */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 8 }}>
          <div style={presets.statLabel}>Delta reg.</div>
          <div style={{
            fontSize: font.size.lg, fontWeight: font.weight.black,
            color: deltaReg > 0 ? colors.status.success : deltaReg < 0 ? colors.status.error : colors.text.muted,
          }}>
            {deltaReg > 0 ? "+" : ""}{deltaReg}
          </div>
          <div style={presets.statLabel}>Delta conv.</div>
          <div style={{
            fontSize: font.size.lg, fontWeight: font.weight.black,
            color: deltaConv > 0 ? colors.status.success : deltaConv < 0 ? colors.status.error : colors.text.muted,
          }}>
            {deltaConv > 0 ? "+" : ""}{deltaConv}%
          </div>
        </div>

        {/* Brand B stats */}
        <div style={{ background: alpha.pink[8], borderRadius: radius["2xl"], padding: 16, border: `1px solid ${alpha.pink[30]}` }}>
          <div style={{ fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.brand.pink, marginBottom: 10 }}>{brandB}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={presets.statLabel}>Edizioni</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.text.primary }}>{aggB.editionCount}</div>
            </div>
            <div>
              <div style={presets.statLabel}>Totale reg.</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.text.primary }}>{aggB.totalRegistrations}</div>
            </div>
            <div>
              <div style={presets.statLabel}>Media/ediz.</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.brand.pink }}>{aggB.avgPerEdition}</div>
            </div>
            <div>
              <div style={presets.statLabel}>Conversione</div>
              <div style={{ fontSize: font.size.xl, fontWeight: font.weight.black, color: colors.status.success }}>{aggB.avgConversion}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Editions table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...presets.sectionLabel, marginBottom: 8 }}>
          Tutte le edizioni
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.size.sm }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Brand</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Edizione</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Registrazioni</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Presenze</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((s, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <td style={{
                    padding: "8px", fontWeight: font.weight.semibold,
                    color: s.isBrandA ? colors.brand.purple : colors.brand.pink,
                  }}>{s.brand}</td>
                  <td style={{ padding: "8px", color: colors.text.primary }}>{s.editionLabel}</td>
                  <td style={{ padding: "8px", color: colors.text.primary, textAlign: "center", fontWeight: font.weight.semibold }}>{s.totalRegistrations}</td>
                  <td style={{ padding: "8px", color: colors.text.muted, textAlign: "center" }}>{s.totalAttended}</td>
                  <td style={{ padding: "8px", color: colors.status.success, textAlign: "center" }}>{s.conversion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlay chart */}
      {overlayData.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={presets.sectionLabel}>
              Curve cumulative registrazioni (giorni prima dell'evento)
            </div>
            <ScaleToggle isLog={logScale} onToggle={setLogScale} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={overlayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
              <XAxis dataKey="label" tick={{ fill: colors.text.muted, fontSize: 10 }} />
              <YAxis scale={logScale ? "log" : "auto"} domain={logScale ? ["auto", "auto"] : [0, "auto"]} allowDataOverflow={logScale} tick={{ fill: colors.text.muted, fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              {allEditionLabels.map((label, i) => {
                if (hiddenLines.has(label)) return null;
                const stat = allStats.find(s => s.displayLabel === label);
                const isBrandA = stat?.brand === brandA;
                return (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={isBrandA ? colors.brand.purple : colors.brand.pink}
                    fill={isBrandA ? alpha.brand[8] : alpha.pink[8]}
                    strokeWidth={2}
                    strokeDasharray={i < statsA.length ? "" : "5 5"}
                    dot={false}
                    connectNulls
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
          {/* Clickable legend */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {allEditionLabels.map((label) => {
              const stat = allStats.find(s => s.displayLabel === label);
              const isBrandA = stat?.brand === brandA;
              const lineColor = isBrandA ? colors.brand.purple : colors.brand.pink;
              const isHidden = hiddenLines.has(label);
              return (
                <button key={label} onClick={() => toggleLine(label)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                  borderRadius: radius.md, border: "none", cursor: "pointer",
                  background: isHidden ? colors.bg.page : "transparent",
                  opacity: isHidden ? 0.4 : 1,
                  transition: "all 0.2s ease",
                }}>
                  <span style={{
                    width: 14, height: 3, background: lineColor, display: "inline-block", borderRadius: 1,
                  }} />
                  <span style={{
                    fontSize: font.size.xs,
                    color: isHidden ? colors.text.disabled : colors.text.muted,
                    textDecoration: isHidden ? "line-through" : "none",
                  }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Original single-brand tracker view
function SingleBrandView({ comparisonData }) {
  const {
    brand, edition, eventDate, currentDaysBefore, isEventPast,
    currentRegistrations, dataRegistrations, isOverridden,
    comparisons, avgAtSamePoint, avgProjectedFinal,
    avgFinal, progressPercent, overlayData, allEditionLabels,
  } = comparisonData;
  const [logScale, setLogScale] = useState(false);
  // Track which lines are visible (all visible by default, plus projection)
  const [hiddenLines, setHiddenLines] = useState(new Set());
  const toggleLine = (label) => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const hasComparisons = comparisons.length > 0;
  const avgDelta = avgAtSamePoint > 0
    ? parseFloat((((currentRegistrations - avgAtSamePoint) / avgAtSamePoint) * 100).toFixed(1))
    : null;

  return (
    <div style={{ ...presets.card, borderRadius: radius["4xl"], padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ ...presets.sectionLabel, marginBottom: 4 }}>
            A che punto siamo
          </div>
          <div style={{ fontSize: font.size["2xl"], fontWeight: font.weight.bold, color: colors.text.primary }}>
            {brand} <span style={{ color: colors.brand.purple }}>{edition}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: font.size.xs, color: colors.text.muted }}>Data evento</div>
          <div style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text.primary }}>
            {eventDate ? eventDate.toLocaleDateString('it', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}
          </div>
          <div style={{
            display: "inline-block", marginTop: 4, padding: "2px 10px",
            borderRadius: radius.lg, fontSize: font.size.sm, fontWeight: font.weight.bold,
            background: currentDaysBefore <= 1 ? colors.status.error : currentDaysBefore <= 3 ? colors.status.warning : colors.bg.elevated,
            color: colors.text.inverse,
          }}>
            {currentDaysBefore === 0 ? "OGGI" : `-${currentDaysBefore} giorni`}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>
            Registrazioni attuali
            {isOverridden && <span style={{ color: colors.status.warning, marginLeft: 4 }}>(live)</span>}
          </div>
          <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: isOverridden ? colors.status.warning : colors.brand.purple }}>
            {currentRegistrations}
          </div>
          {isOverridden && (
            <div style={{ fontSize: 10, color: colors.text.disabled, marginTop: 2 }}>
              da file: {dataRegistrations}
            </div>
          )}
        </div>
        {hasComparisons && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>Media allo stesso punto</div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: colors.text.primary }}>{avgAtSamePoint}</div>
          </div>
        )}
        {hasComparisons && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>Rispetto alla media</div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black }}>
              <DeltaBadge value={avgDelta} />
            </div>
          </div>
        )}
        {!isEventPast && avgProjectedFinal != null && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>Proiezione finale</div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: colors.status.success }}>~{avgProjectedFinal}</div>
          </div>
        )}
      </div>

      {/* Progress bar — only when there are comparisons */}
      {hasComparisons && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>
            <span>Progresso vs media finale ({avgFinal})</span>
            <span>{Math.min(progressPercent, 100)}%</span>
          </div>
          <div style={{ background: colors.bg.page, borderRadius: radius.md, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(progressPercent, 100)}%`, height: "100%", borderRadius: radius.md,
              background: progressPercent >= 100 ? colors.status.success : gradients.progress,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      )}

      {/* Comparison table — only when there are past editions to compare */}
      {hasComparisons && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...presets.sectionLabel, marginBottom: 8 }}>
            Confronto edizioni precedenti
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.size.sm }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Edizione</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>A -{currentDaysBefore}gg</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Delta</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Finale</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Conv.</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>% a -{currentDaysBefore}gg</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <td style={{ padding: "8px", color: colors.text.primary, fontWeight: font.weight.semibold }}>{c.editionLabel}</td>
                    <td style={{ padding: "8px", color: colors.text.primary, textAlign: "center" }}>{c.atSamePoint}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <DeltaBadge value={c.deltaPercent} />
                    </td>
                    <td style={{ padding: "8px", color: colors.text.muted, textAlign: "center" }}>{c.totalFinal}</td>
                    <td style={{ padding: "8px", color: colors.text.muted, textAlign: "center" }}>{c.finalConversion}%</td>
                    <td style={{ padding: "8px", color: colors.text.muted, textAlign: "center" }}>{c.completionPercent}%</td>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={presets.sectionLabel}>
              Curve cumulative registrazioni
            </div>
            <ScaleToggle isLog={logScale} onToggle={setLogScale} />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={overlayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
              <XAxis dataKey="label" tick={{ fill: colors.text.muted, fontSize: 10 }} />
              <YAxis scale={logScale ? "log" : "auto"} domain={logScale ? ["auto", "auto"] : [0, "auto"]} allowDataOverflow={logScale} tick={{ fill: colors.text.muted, fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              {currentDaysBefore > 0 && (
                <ReferenceLine
                  x={`-${currentDaysBefore}`}
                  stroke={colors.status.warning} strokeDasharray="5 5" strokeWidth={2}
                  label={{ value: "OGGI", fill: colors.status.warning, fontSize: 10, position: "top" }}
                />
              )}
              {allEditionLabels.map((label, i) => {
                if (hiddenLines.has(label)) return null;
                const isCurrent = i === 0;
                const pastOpacity = Math.max(0.25, 1 - (i * 0.15));
                return (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={isCurrent ? colors.brand.purple : `rgba(148, 163, 184, ${pastOpacity})`}
                    fill={isCurrent ? alpha.brand[15] : "transparent"}
                    strokeWidth={isCurrent ? 3 : 1.5}
                    strokeDasharray={isCurrent ? "" : "5 5"}
                    dot={false}
                    connectNulls
                  />
                );
              })}
              {/* Projection line */}
              {!hiddenLines.has('_projection') && overlayData.some(p => p._projection != null) && (
                <Area
                  type="monotone"
                  dataKey="_projection"
                  stroke={colors.status.success}
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                  name="Proiezione"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
          {/* Clickable legend */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {allEditionLabels.map((label, i) => {
              const isCurrent = i === 0;
              const isHidden = hiddenLines.has(label);
              const pastOpacity = Math.max(0.25, 1 - (i * 0.15));
              const lineColor = isCurrent ? colors.brand.purple : `rgba(148, 163, 184, ${pastOpacity})`;
              return (
                <button key={label} onClick={() => toggleLine(label)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                  borderRadius: radius.md, border: "none", cursor: "pointer",
                  background: isHidden ? colors.bg.page : "transparent",
                  opacity: isHidden ? 0.4 : 1,
                  transition: "all 0.2s ease",
                }}>
                  <span style={{
                    width: 14, height: isCurrent ? 3 : 2,
                    background: lineColor, display: "inline-block", borderRadius: 1,
                    borderBottom: isCurrent ? "none" : `1px dashed ${lineColor}`,
                  }} />
                  <span style={{
                    fontSize: font.size.xs,
                    color: isHidden ? colors.text.disabled : colors.text.muted,
                    fontWeight: isCurrent ? font.weight.semibold : font.weight.normal,
                    textDecoration: isHidden ? "line-through" : "none",
                  }}>{label}</span>
                </button>
              );
            })}
            {/* Projection toggle */}
            {overlayData.some(p => p._projection != null) && (
              <button onClick={() => toggleLine('_projection')} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                borderRadius: radius.md, border: "none", cursor: "pointer",
                background: hiddenLines.has('_projection') ? colors.bg.page : "transparent",
                opacity: hiddenLines.has('_projection') ? 0.4 : 1,
                transition: "all 0.2s ease",
              }}>
                <span style={{
                  width: 14, height: 2, display: "inline-block", borderRadius: 1,
                  borderBottom: `2px dashed ${colors.status.success}`,
                }} />
                <span style={{
                  fontSize: font.size.xs,
                  color: hiddenLines.has('_projection') ? colors.text.disabled : colors.text.muted,
                  textDecoration: hiddenLines.has('_projection') ? "line-through" : "none",
                }}>Proiezione</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main component - routes to correct view
export default function WhereAreWeNow({ comparisonData }) {
  if (!comparisonData) return null;

  if (comparisonData.isCrossBrand) {
    return <CrossBrandView comparisonData={comparisonData} />;
  }

  return <SingleBrandView comparisonData={comparisonData} />;
}
