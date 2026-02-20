import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DeltaBadge } from '../shared/Badge';
import ScaleToggle from '../shared/ScaleToggle';
import { useSortable, Th } from '../shared/SortableTable';
import DataCards from '../shared/DataCards';
import { TOOLTIP_STYLE } from '../../config/constants';
import { colors, font, radius, gradients, presets, alpha } from '../../config/designTokens';

// Cross-brand comparison view
function CrossBrandView({ comparisonData }) {
  const { brandA, brandB, statsA, statsB, aggA, aggB, overlayData, allEditionLabels, allStats } = comparisonData;
  const [logScale, setLogScale] = useState(false);
  const [compressed, setCompressed] = useState(true);
  const [hiddenLines, setHiddenLines] = useState(new Set());
  const toggleLine = (label) => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Compressed overlay for cross-brand chart
  const chartData = useMemo(() => {
    if (!compressed || !overlayData || overlayData.length === 0) return overlayData;
    const keep = new Set([0]);
    for (let i = 0; i < overlayData.length; i++) {
      const pt = overlayData[i];
      for (const k of allEditionLabels) {
        if (pt[k] != null) {
          let prevVal = null;
          for (let j = i - 1; j >= 0; j--) {
            if (overlayData[j][k] != null) { prevVal = overlayData[j][k]; break; }
          }
          if (prevVal === null || pt[k] !== prevVal) keep.add(pt.daysBefore);
        }
      }
    }
    return overlayData.filter(pt => keep.has(pt.daysBefore));
  }, [overlayData, compressed, allEditionLabels]);

  const deltaReg = aggA.avgPerEdition - aggB.avgPerEdition;
  const deltaConv = parseFloat((aggA.avgConversion - aggB.avgConversion).toFixed(1));

  // Table data: all editions of both brands
  const tableDataRaw = allStats.map(s => ({
    ...s,
    isBrandA: s.brand === brandA,
  }));
  const { sorted: tableData, sortKey: tSortKey, sortDir: tSortDir, toggleSort: tToggleSort } = useSortable(tableDataRaw, 'eventDate', 'asc');

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
      <div className="grid-2-col cross-brand-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 20 }}>
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
        {/* Desktop: table */}
        <div className="desktop-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.size.sm }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
                <Th columnKey="brand" sortKey={tSortKey} sortDir={tSortDir} onSort={tToggleSort}>Brand</Th>
                <Th columnKey="editionLabel" sortKey={tSortKey} sortDir={tSortDir} onSort={tToggleSort}>Edizione</Th>
                <Th columnKey="totalRegistrations" sortKey={tSortKey} sortDir={tSortDir} onSort={tToggleSort} align="center">Registrazioni</Th>
                <Th columnKey="totalAttended" sortKey={tSortKey} sortDir={tSortDir} onSort={tToggleSort} align="center">Presenze</Th>
                <Th columnKey="conversion" sortKey={tSortKey} sortDir={tSortDir} onSort={tToggleSort} align="center">Conv.</Th>
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
        {/* Mobile: cards */}
        <DataCards
          items={tableData}
          fields={[
            { key: 'brand', label: 'Brand', primary: true, render: s => <span style={{ color: s.isBrandA ? colors.brand.purple : colors.brand.pink }}>{s.brand}</span> },
            { key: 'editionLabel', label: 'Edizione', badge: true },
            { key: 'totalRegistrations', label: 'Registrazioni' },
            { key: 'totalAttended', label: 'Presenze' },
            { key: 'conversion', label: 'Conv.', render: s => `${s.conversion}%`, color: () => colors.status.success },
          ]}
        />
      </div>

      {/* Overlay chart */}
      {overlayData.length > 0 && (() => {
        // Assign a unique color to each edition from the chart palette
        const editionColorMap = {};
        let colorIdx = 0;
        statsA.forEach((s) => { editionColorMap[s.displayLabel] = colors.chart[colorIdx % colors.chart.length]; colorIdx++; });
        statsB.forEach((s) => { editionColorMap[s.displayLabel] = colors.chart[colorIdx % colors.chart.length]; colorIdx++; });

        return (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={presets.sectionLabel}>
                Curve cumulative registrazioni
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => setCompressed(v => !v)} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs,
                  border: `1px solid ${compressed ? colors.brand.purple : colors.border.default}`,
                  background: compressed ? alpha.brand[15] : "transparent",
                  color: compressed ? colors.brand.purple : colors.text.muted,
                  cursor: "pointer", fontWeight: font.weight.medium,
                }}>
                  Comprimi
                </button>
                <ScaleToggle isLog={logScale} onToggle={setLogScale} />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 8" stroke={colors.border.subtle} />
                <XAxis dataKey="label" tick={{ fill: colors.text.disabled, fontSize: 10 }} axisLine={{ stroke: colors.border.subtle }} tickLine={false} />
                <YAxis scale={logScale ? "log" : "auto"} domain={logScale ? ["auto", "auto"] : [0, "auto"]} allowDataOverflow={logScale} tick={{ fill: colors.text.disabled, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                {allEditionLabels.map((label) => {
                  if (hiddenLines.has(label)) return null;
                  const stat = allStats.find(s => s.displayLabel === label);
                  const isBrandA = stat?.brand === brandA;
                  const group = isBrandA ? statsA : statsB;
                  const isLatest = group[group.length - 1]?.displayLabel === label;
                  const edColor = editionColorMap[label] || colors.text.muted;
                  return (
                    <Area
                      key={label}
                      type="monotone"
                      dataKey={label}
                      stroke={edColor}
                      fill="transparent"
                      strokeWidth={isLatest ? 2.5 : 1.5}
                      strokeDasharray={isLatest ? "" : "5 3"}
                      dot={false}
                      connectNulls
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend grouped by brand */}
            <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              {[{ brand: brandA, stats: statsA, color: colors.brand.purple },
                { brand: brandB, stats: statsB, color: colors.brand.pink }].map(({ brand, stats, color }) => (
                <div key={brand} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: font.weight.bold, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {brand}
                  </span>
                  {stats.map((st) => {
                    const isHidden = hiddenLines.has(st.displayLabel);
                    const edColor = editionColorMap[st.displayLabel];
                    const isLatest = stats[stats.length - 1]?.displayLabel === st.displayLabel;
                    return (
                      <button key={st.displayLabel} onClick={() => toggleLine(st.displayLabel)} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "1px 4px",
                        borderRadius: radius.sm, border: "none", cursor: "pointer",
                        background: "transparent", opacity: isHidden ? 0.3 : 1,
                        transition: "all 0.2s ease",
                      }}>
                        <span style={{
                          width: 16, height: isLatest ? 3 : 2, flexShrink: 0,
                          background: edColor, display: "inline-block", borderRadius: 1,
                        }} />
                        <span style={{
                          fontSize: 10, color: isHidden ? colors.text.disabled : colors.text.muted,
                          textDecoration: isHidden ? "line-through" : "none",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200,
                        }}>{st.editionLabel}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Original single-brand tracker view
const PROJ_MODELS = [
  { key: 'regression', label: 'Regressione' },
  { key: 'ensemble', label: 'Bilanciato' },
];

function SingleBrandView({ comparisonData }) {
  const {
    brand, edition, eventDate, currentDaysBefore, isEventPast,
    currentRegistrations, dataRegistrations, isOverridden,
    currentAttended, currentConversion,
    comparisons, avgAtSamePoint, avgProjectedFinal,
    regressionProjection, ensembleProjection,
    avgFinal, progressPercent, overlayData, allEditionLabels,
    snapshotHour,
  } = comparisonData;
  const [logScale, setLogScale] = useState(false);
  const [compressed, setCompressed] = useState(true);
  const [projModel, setProjModel] = useState('regression');
  // Track which lines are visible (all visible by default, plus projection)
  const [hiddenLines, setHiddenLines] = useState(new Set());

  const activeProjection = projModel === 'ensemble' ? ensembleProjection : regressionProjection;
  const projDataKey = projModel === 'ensemble' ? '_projEnsemble' : '_projRegression';
  const toggleLine = (label) => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Compressed overlay: keep only days where at least one edition changes value,
  // plus always keep day 0 (event), currentDaysBefore (today), and first/last data points
  const chartData = useMemo(() => {
    if (!compressed || !overlayData || overlayData.length === 0) return overlayData;
    const edKeys = allEditionLabels;
    const keep = new Set([0, currentDaysBefore]);
    for (let i = 0; i < overlayData.length; i++) {
      const pt = overlayData[i];
      for (const k of edKeys) {
        if (pt[k] != null) {
          // Keep this point if it's the first non-null or value differs from previous non-null
          let prevVal = null;
          for (let j = i - 1; j >= 0; j--) {
            if (overlayData[j][k] != null) { prevVal = overlayData[j][k]; break; }
          }
          if (prevVal === null || pt[k] !== prevVal) {
            keep.add(pt.daysBefore);
          }
        }
      }
      // Always keep projection points
      if (pt._projRegression != null || pt._projEnsemble != null) keep.add(pt.daysBefore);
    }
    return overlayData.filter(pt => keep.has(pt.daysBefore));
  }, [overlayData, compressed, allEditionLabels, currentDaysBefore]);

  const hasComparisons = comparisons.length > 0;
  const { sorted: sortedComparisons, sortKey: cSortKey, sortDir: cSortDir, toggleSort: cToggleSort } = useSortable(comparisons, 'atSamePoint', 'desc');
  const avgDelta = avgAtSamePoint > 0
    ? parseFloat((((currentRegistrations - avgAtSamePoint) / avgAtSamePoint) * 100).toFixed(1))
    : null;

  return (
    <div style={{ ...presets.card, borderRadius: radius["4xl"], padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ ...presets.sectionLabel, marginBottom: 4 }}>
            {isEventPast ? "Riepilogo edizione" : "A che punto siamo"}
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
            background: isEventPast ? colors.bg.elevated : currentDaysBefore <= 1 ? colors.status.error : currentDaysBefore <= 3 ? colors.status.warning : colors.bg.elevated,
            color: colors.text.inverse,
          }}>
            {isEventPast ? "Concluso" : currentDaysBefore === 0 ? "OGGI" : `-${currentDaysBefore} giorni`}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="tracker-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>
            {isEventPast ? "Registrazioni totali" : "Registrazioni attuali"}
            {!isEventPast && isOverridden && <span style={{ color: colors.status.warning, marginLeft: 4 }}>(live)</span>}
          </div>
          <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: isOverridden && !isEventPast ? colors.status.warning : colors.brand.purple }}>
            {currentRegistrations}
          </div>
          {!isEventPast && isOverridden && (
            <div style={{ fontSize: 10, color: colors.text.disabled, marginTop: 2 }}>
              da file: {dataRegistrations}
            </div>
          )}
        </div>
        {isEventPast && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>Presenze</div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: colors.text.primary }}>{currentAttended}</div>
          </div>
        )}
        {isEventPast && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>Conversione</div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: colors.status.success }}>{currentConversion}%</div>
          </div>
        )}
        {hasComparisons && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>
              {isEventPast ? "Media finale altre edizioni" : "Media allo stesso punto"}
            </div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: colors.text.primary }}>{avgAtSamePoint}</div>
          </div>
        )}
        {hasComparisons && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>
              {isEventPast ? "vs media finale" : "Rispetto alla media"}
            </div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black }}>
              <DeltaBadge value={avgDelta} />
            </div>
          </div>
        )}
        {!isEventPast && activeProjection != null && (
          <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>Proiezione finale</div>
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: colors.status.success }}>~{activeProjection}</div>
            {/* Model toggle */}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 6 }}>
              {PROJ_MODELS.map(m => (
                <button key={m.key} onClick={() => setProjModel(m.key)} style={{
                  padding: "2px 8px", borderRadius: radius.md, fontSize: 10, fontWeight: font.weight.medium,
                  border: `1px solid ${projModel === m.key ? colors.brand.purple : colors.border.default}`,
                  background: projModel === m.key ? alpha.brand[15] : "transparent",
                  color: projModel === m.key ? colors.brand.purple : colors.text.disabled,
                  cursor: "pointer", transition: "all 0.15s ease",
                }}>{m.label}</button>
              ))}
            </div>
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
          {/* Desktop: table */}
          <div className="desktop-table" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.size.sm }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
                  <Th columnKey="editionLabel" sortKey={cSortKey} sortDir={cSortDir} onSort={cToggleSort}>Edizione</Th>
                  <Th columnKey="atSamePoint" sortKey={cSortKey} sortDir={cSortDir} onSort={cToggleSort} align="center">A -{currentDaysBefore}gg{!isEventPast && snapshotHour ? ` (${snapshotHour})` : ''}</Th>
                  <Th columnKey="deltaPercent" sortKey={cSortKey} sortDir={cSortDir} onSort={cToggleSort} align="center">Delta</Th>
                  <Th columnKey="totalFinal" sortKey={cSortKey} sortDir={cSortDir} onSort={cToggleSort} align="center">Finale</Th>
                  <Th columnKey="finalConversion" sortKey={cSortKey} sortDir={cSortDir} onSort={cToggleSort} align="center">Conv.</Th>
                  <Th columnKey="completionPercent" sortKey={cSortKey} sortDir={cSortDir} onSort={cToggleSort} align="center">% a -{currentDaysBefore}gg</Th>
                </tr>
              </thead>
              <tbody>
                {sortedComparisons.map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <td style={{ padding: "8px", color: colors.text.primary, fontWeight: font.weight.semibold }}>{c.editionLabel}</td>
                    <td style={{ padding: "8px", color: colors.text.primary, textAlign: "center" }} title={!isEventPast && c.atSamePointAdjusted !== c.atSamePoint ? `Fine giornata: ${c.atSamePoint}` : undefined}>
                      {!isEventPast && c.atSamePointAdjusted != null ? c.atSamePointAdjusted : c.atSamePoint}
                    </td>
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
          {/* Mobile: cards */}
          <DataCards
            items={sortedComparisons}
            fields={[
              { key: 'editionLabel', label: 'Edizione', primary: true },
              { key: 'deltaPercent', label: 'Delta', badge: true, render: c => <DeltaBadge value={c.deltaPercent} /> },
              { key: 'atSamePointAdj', label: `A -${currentDaysBefore}gg`, render: c => !isEventPast && c.atSamePointAdjusted != null ? c.atSamePointAdjusted : c.atSamePoint },
              { key: 'totalFinal', label: 'Finale' },
              { key: 'finalConversion', label: 'Conv.', render: c => `${c.finalConversion}%` },
              { key: 'completionPercent', label: `Completamento`, render: c => `${c.completionPercent}%` },
            ]}
          />
        </div>
      )}

      {/* Overlay chart */}
      {overlayData.length > 0 && (() => {
        // Assign distinct color per edition: current = first chart color, past = subsequent
        const edColorMap = {};
        allEditionLabels.forEach((label, i) => { edColorMap[label] = colors.chart[i % colors.chart.length]; });

        return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <div style={presets.sectionLabel}>
              Curve cumulative registrazioni
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => setCompressed(v => !v)} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs,
                border: `1px solid ${compressed ? colors.brand.purple : colors.border.default}`,
                background: compressed ? alpha.brand[15] : "transparent",
                color: compressed ? colors.brand.purple : colors.text.muted,
                cursor: "pointer", fontWeight: font.weight.medium,
              }}>
                Comprimi
              </button>
              <ScaleToggle isLog={logScale} onToggle={setLogScale} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 8" stroke={colors.border.subtle} />
              <XAxis dataKey="label" tick={{ fill: colors.text.disabled, fontSize: 10 }} axisLine={{ stroke: colors.border.subtle }} tickLine={false} />
              <YAxis scale={logScale ? "log" : "auto"} domain={logScale ? ["auto", "auto"] : [0, "auto"]} allowDataOverflow={logScale} tick={{ fill: colors.text.disabled, fontSize: 10 }} axisLine={false} tickLine={false} />
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
                const edColor = edColorMap[label];
                return (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={edColor}
                    fill={isCurrent ? `${edColor}18` : "transparent"}
                    strokeWidth={isCurrent ? 3 : 1.5}
                    strokeDasharray={isCurrent ? "" : "5 3"}
                    dot={false}
                    connectNulls
                  />
                );
              })}
              {/* Projection line — shows selected model */}
              {!hiddenLines.has('_projection') && chartData.some(p => p[projDataKey] != null) && (
                <Area
                  type="monotone"
                  dataKey={projDataKey}
                  stroke={colors.status.success}
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                  name={`Proiezione (${PROJ_MODELS.find(m => m.key === projModel)?.label || ''})`}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
          {/* Clickable legend */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {allEditionLabels.map((label, i) => {
              const isCurrent = i === 0;
              const isHidden = hiddenLines.has(label);
              const edColor = edColorMap[label];
              return (
                <button key={label} onClick={() => toggleLine(label)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                  borderRadius: radius.md, border: "none", cursor: "pointer",
                  background: "transparent",
                  opacity: isHidden ? 0.3 : 1,
                  transition: "all 0.2s ease",
                }}>
                  <span style={{
                    width: 16, height: isCurrent ? 3 : 2,
                    background: edColor, display: "inline-block", borderRadius: 1,
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
            {chartData.some(p => p._projRegression != null || p._projEnsemble != null) && (
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
        );
      })()}
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
