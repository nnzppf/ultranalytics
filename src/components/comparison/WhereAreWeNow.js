import { useState, useMemo, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FileText, X, Copy, Check, Loader, Share2 } from 'lucide-react';
import { DeltaBadge } from '../shared/Badge';
import ScaleToggle from '../shared/ScaleToggle';
import { useSortable, Th } from '../shared/SortableTable';
import DataCards from '../shared/DataCards';
import { TOOLTIP_STYLE } from '../../config/constants';
import { linReg } from '../../utils/comparisonEngine';
import { buildTrackerSummary } from '../../utils/dataSummarizer';
import { generateTrackerReport, isGeminiConfigured } from '../../services/geminiService';
import { colors, font, radius, gradients, presets, alpha, shadows } from '../../config/designTokens';

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
    comparisons, avgAtSamePoint,
    regressionProjection, ensembleProjection,
    avgFinal, progressPercent, overlayData, allEditionLabels,
    snapshotHour,
  } = comparisonData;
  const [logScale, setLogScale] = useState(false);
  const [compressed, setCompressed] = useState(true);
  const [projModel, setProjModel] = useState('regression');
  // Track which lines are visible (all visible by default, plus projection)
  const [hiddenLines, setHiddenLines] = useState(new Set());
  // Year filter: excluded years for avg/projection recalculation
  const [excludedYears, setExcludedYears] = useState(new Set());
  // AI Report state
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  const handleGenerateReport = useCallback(async () => {
    if (reportLoading) return;
    setReportLoading(true);
    setShowReport(true);
    setReportText('');
    try {
      const summary = buildTrackerSummary(comparisonData);
      const text = await generateTrackerReport(summary);
      setReportText(text);
    } catch (err) {
      setReportText(`Errore nella generazione del report: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  }, [comparisonData, reportLoading]);

  const handleCopyReport = useCallback(() => {
    if (!reportText) return;
    const plain = reportText.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^##\s*/gm, '').replace(/^- /gm, '  - ');
    navigator.clipboard.writeText(plain).then(() => {
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    });
  }, [reportText]);

  const reportCardRef = useRef(null);
  const [shareLoading, setShareLoading] = useState(false);

  // Simplified chart data for report card: only current edition + overall average
  const reportChartData = useMemo(() => {
    if (!overlayData || overlayData.length === 0 || allEditionLabels.length === 0) return [];
    const currentLabel = allEditionLabels[0];
    const pastLabels = allEditionLabels.slice(1);
    return overlayData.map(pt => {
      const vals = pastLabels.map(l => pt[l]).filter(v => v != null);
      return {
        daysBefore: pt.daysBefore,
        label: pt.label,
        current: pt[currentLabel] != null ? pt[currentLabel] : null,
        media: vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null,
      };
    });
  }, [overlayData, allEditionLabels]);

  const handleShareReport = useCallback(async () => {
    if (!reportCardRef.current || shareLoading) return;
    setShareLoading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-solid').trim() || '#1e293b';
      const canvas = await html2canvas(reportCardRef.current, { backgroundColor: bgColor, scale: 2, useCORS: true });
      const fileName = `report-${brand}-${edition}-${new Date().toISOString().slice(0, 10)}.png`;
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Report ${brand} ${edition}` });
            setShareLoading(false);
            return;
          }
        } catch (e) {
          if (e.name === 'AbortError') { setShareLoading(false); return; }
        }
      }
      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('Share report error:', err);
    } finally {
      setShareLoading(false);
    }
  }, [brand, edition, shareLoading]);
  // Toggle yearly average curves
  const [showAvgCurves, setShowAvgCurves] = useState(false);

  // Available years from comparisons
  const availableYears = useMemo(() => {
    const years = new Set();
    for (const c of comparisons) {
      if (c.eventDate) years.add(c.eventDate.getFullYear());
    }
    return [...years].sort();
  }, [comparisons]);

  // Map edition label → year
  const editionToYear = useMemo(() => {
    const map = {};
    for (const c of comparisons) {
      if (c.eventDate) map[c.editionLabel] = c.eventDate.getFullYear();
    }
    return map;
  }, [comparisons]);

  const toggleYear = (year) => {
    setExcludedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  // Yearly average cumulative curves (only from included years)
  const yearAvgCurves = useMemo(() => {
    const byYear = {};
    for (const c of comparisons) {
      if (!c.eventDate) continue;
      const year = c.eventDate.getFullYear();
      if (excludedYears.has(year)) continue;
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(c);
    }
    const result = {};
    for (const [year, comps] of Object.entries(byYear)) {
      if (comps.length < 1) continue;
      const allDays = new Set();
      for (const c of comps) {
        for (const d of Object.keys(c.cumulative)) allDays.add(Number(d));
      }
      const avgCurve = {};
      for (const d of allDays) {
        const vals = comps.map(c => c.cumulative[d]).filter(v => v != null);
        if (vals.length > 0) {
          avgCurve[d] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
        }
      }
      result[year] = avgCurve;
    }
    return result;
  }, [comparisons, excludedYears]);

  const yearAvgKeys = useMemo(() => Object.keys(yearAvgCurves).map(Number).sort(), [yearAvgCurves]);

  // Filtered comparisons based on excluded years
  const filteredComparisons = useMemo(() => {
    if (excludedYears.size === 0) return comparisons;
    return comparisons.filter(c => !c.eventDate || !excludedYears.has(c.eventDate.getFullYear()));
  }, [comparisons, excludedYears]);

  // Recompute averages and projections from filtered comparisons
  const filtered = useMemo(() => {
    const validComps = filteredComparisons.filter(c => c.atSamePoint > 0);
    const fAvgAtSamePoint = validComps.length
      ? Math.round(validComps.reduce((s, c) => s + (c.atSamePointAdjusted ?? c.atSamePoint), 0) / validComps.length)
      : 0;
    const fAvgFinal = filteredComparisons.length
      ? Math.round(filteredComparisons.reduce((s, c) => s + c.totalFinal, 0) / filteredComparisons.length)
      : 0;
    const fProgressPercent = fAvgFinal > 0 ? Math.round((currentRegistrations / fAvgFinal) * 100) : 0;

    // Regression projection
    let fRegProj = null;
    if (!isEventPast && validComps.length >= 2) {
      const pts = validComps.map(c => ({ x: c.atSamePointAdjusted ?? c.atSamePoint, y: c.totalFinal }));
      const reg = linReg(pts);
      if (reg && reg.a > 0) {
        fRegProj = Math.round(reg.a * currentRegistrations + reg.b);
        if (fRegProj < currentRegistrations) fRegProj = null;
      }
    }

    // Ensemble projection
    let fEnsProj = null;
    if (!isEventPast && validComps.length >= 2) {
      const DECAY = 2;
      const dayPredictions = [];
      const maxDayComp = Math.max(...filteredComparisons.map(c => Math.max(...Object.keys(c.cumulative).map(Number), 0)), 0);
      for (let d = maxDayComp; d >= 1; d--) {
        const pts = [];
        for (const c of filteredComparisons) {
          const val = c.cumulative[d];
          if (val != null && val > 0) pts.push({ x: val, y: c.totalFinal });
        }
        if (pts.length < 2) continue;
        const reg = linReg(pts);
        if (!reg || reg.a <= 0) continue;
        const currVal = comparisonData.targetCumulative?.[d];
        if (currVal == null || currVal <= 0) continue;
        const pred = Math.round(reg.a * currVal + reg.b);
        if (pred > currVal) dayPredictions.push({ day: d, pred });
      }
      if (fRegProj != null) dayPredictions.push({ day: 0, pred: fRegProj });
      if (dayPredictions.length > 0) {
        const maxDay = Math.max(...dayPredictions.map(p => p.day));
        let wSum = 0, wTotal = 0;
        for (const p of dayPredictions) {
          const w = Math.pow(DECAY, maxDay - p.day);
          wSum += p.pred * w;
          wTotal += w;
        }
        fEnsProj = Math.round(wSum / wTotal);
        if (fEnsProj < currentRegistrations) fEnsProj = null;
      }
    }

    return { avgAtSamePoint: fAvgAtSamePoint, avgFinal: fAvgFinal, progressPercent: fProgressPercent, regressionProjection: fRegProj, ensembleProjection: fEnsProj };
  }, [filteredComparisons, currentRegistrations, isEventPast, comparisonData.targetCumulative]);

  // Use filtered values when year filter is active, original values otherwise
  const isYearFiltered = excludedYears.size > 0;
  const effectiveAvgAtSamePoint = isYearFiltered ? filtered.avgAtSamePoint : avgAtSamePoint;
  const effectiveAvgFinal = isYearFiltered ? filtered.avgFinal : avgFinal;
  const effectiveProgressPercent = isYearFiltered ? filtered.progressPercent : progressPercent;
  const effectiveRegProj = isYearFiltered ? filtered.regressionProjection : regressionProjection;
  const effectiveEnsProj = isYearFiltered ? filtered.ensembleProjection : ensembleProjection;

  const activeProjection = projModel === 'ensemble' ? effectiveEnsProj : effectiveRegProj;
  const projDataKey = projModel === 'ensemble' ? '_projEnsemble' : '_projRegression';
  const toggleLine = (label) => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Enrich overlay data with yearly average curves
  const enrichedOverlayData = useMemo(() => {
    if (!overlayData || overlayData.length === 0) return overlayData;
    return overlayData.map(pt => {
      const enriched = { ...pt };
      for (const year of yearAvgKeys) {
        const key = `_avg${year}`;
        const val = yearAvgCurves[year]?.[pt.daysBefore];
        enriched[key] = val != null ? val : null;
      }
      return enriched;
    });
  }, [overlayData, yearAvgCurves, yearAvgKeys]);

  // Compressed overlay: keep only days where at least one edition changes value,
  // plus always keep day 0 (event), currentDaysBefore (today), and first/last data points
  const chartData = useMemo(() => {
    const data = enrichedOverlayData;
    if (!compressed || !data || data.length === 0) return data;
    const avgKeys = yearAvgKeys.map(y => `_avg${y}`);
    const allKeys = [...allEditionLabels, ...avgKeys];
    const keep = new Set([0, currentDaysBefore]);
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      for (const k of allKeys) {
        if (pt[k] != null) {
          let prevVal = null;
          for (let j = i - 1; j >= 0; j--) {
            if (data[j][k] != null) { prevVal = data[j][k]; break; }
          }
          if (prevVal === null || pt[k] !== prevVal) {
            keep.add(pt.daysBefore);
          }
        }
      }
      if (pt._projRegression != null || pt._projEnsemble != null) keep.add(pt.daysBefore);
    }
    return data.filter(pt => keep.has(pt.daysBefore));
  }, [enrichedOverlayData, compressed, allEditionLabels, currentDaysBefore, yearAvgKeys]);

  const hasComparisons = comparisons.length > 0;
  const hasFilteredComparisons = filteredComparisons.length > 0;
  const { sorted: sortedComparisons, sortKey: cSortKey, sortDir: cSortDir, toggleSort: cToggleSort } = useSortable(comparisons, 'eventDate', 'asc');
  const avgDelta = effectiveAvgAtSamePoint > 0
    ? parseFloat((((currentRegistrations - effectiveAvgAtSamePoint) / effectiveAvgAtSamePoint) * 100).toFixed(1))
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
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, justifyContent: "flex-end" }}>
            <div style={{
              display: "inline-block", padding: "2px 10px",
              borderRadius: radius.lg, fontSize: font.size.sm, fontWeight: font.weight.bold,
              background: isEventPast ? colors.bg.elevated : currentDaysBefore <= 1 ? colors.status.error : currentDaysBefore <= 3 ? colors.status.warning : colors.bg.elevated,
              color: colors.text.inverse,
            }}>
              {isEventPast ? "Concluso" : currentDaysBefore === 0 ? "OGGI" : `-${currentDaysBefore} giorni`}
            </div>
            {isGeminiConfigured() && (
              <button onClick={handleGenerateReport} disabled={reportLoading} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                borderRadius: radius.lg, fontSize: font.size.xs, fontWeight: font.weight.medium,
                border: "none", cursor: reportLoading ? "wait" : "pointer",
                background: gradients.brandAlt, color: colors.text.inverse,
                transition: "all 0.15s ease", opacity: reportLoading ? 0.7 : 1,
              }}>
                {reportLoading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={12} />}
                Report AI
              </button>
            )}
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
            <div style={{ fontSize: font.size["4xl"], fontWeight: font.weight.black, color: colors.text.primary }}>{effectiveAvgAtSamePoint}</div>
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
      {hasFilteredComparisons && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4 }}>
            <span>Progresso vs media finale ({effectiveAvgFinal})</span>
            <span>{Math.min(effectiveProgressPercent, 100)}%</span>
          </div>
          <div style={{ background: colors.bg.page, borderRadius: radius.md, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(effectiveProgressPercent, 100)}%`, height: "100%", borderRadius: radius.md,
              background: effectiveProgressPercent >= 100 ? colors.status.success : gradients.progress,
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

        // Colors for yearly average curves — consistent warm/cool palette
        const yearAvgColorPalette = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
        const yearAvgColorMap = {};
        yearAvgKeys.forEach((year, i) => { yearAvgColorMap[year] = yearAvgColorPalette[i % yearAvgColorPalette.length]; });

        return (
        <div>
          {/* Header row: title + controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
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
          {/* Year filter chips + Medie toggle */}
          {availableYears.length > 1 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              {availableYears.map(year => {
                const isExcluded = excludedYears.has(year);
                return (
                  <button key={year} onClick={() => toggleYear(year)} style={{
                    padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs, fontWeight: font.weight.semibold,
                    border: `1px solid ${isExcluded ? colors.border.default : colors.brand.purple}`,
                    background: isExcluded ? "transparent" : alpha.brand[15],
                    color: isExcluded ? colors.text.disabled : colors.brand.purple,
                    cursor: "pointer", transition: "all 0.15s ease",
                    textDecoration: isExcluded ? "line-through" : "none",
                    opacity: isExcluded ? 0.5 : 1,
                  }}>
                    {year}
                  </button>
                );
              })}
              <span style={{ width: 1, height: 16, background: colors.border.default, margin: "0 2px" }} />
              <button onClick={() => setShowAvgCurves(v => !v)} style={{
                padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs, fontWeight: font.weight.medium,
                border: `1px solid ${showAvgCurves ? '#f59e0b' : colors.border.default}`,
                background: showAvgCurves ? 'rgba(245,158,11,0.15)' : "transparent",
                color: showAvgCurves ? '#f59e0b' : colors.text.muted,
                cursor: "pointer", transition: "all 0.15s ease",
              }}>
                Medie per anno
              </button>
            </div>
          )}
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
              {/* Individual edition lines — hide if year is excluded */}
              {allEditionLabels.map((label, i) => {
                if (hiddenLines.has(label)) return null;
                const isCurrent = i === 0;
                // Hide past editions whose year is excluded (never hide current edition)
                if (!isCurrent && editionToYear[label] && excludedYears.has(editionToYear[label])) return null;
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
              {/* Yearly average curves */}
              {showAvgCurves && yearAvgKeys.map(year => {
                const key = `_avg${year}`;
                if (hiddenLines.has(key)) return null;
                const avgColor = yearAvgColorMap[year];
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={avgColor}
                    fill="transparent"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    name={`Media ${year}`}
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
              // Hide legend items for excluded years (keep current edition)
              if (!isCurrent && editionToYear[label] && excludedYears.has(editionToYear[label])) return null;
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
            {/* Yearly average legend entries */}
            {showAvgCurves && yearAvgKeys.map(year => {
              const key = `_avg${year}`;
              const isHidden = hiddenLines.has(key);
              const avgColor = yearAvgColorMap[year];
              return (
                <button key={key} onClick={() => toggleLine(key)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                  borderRadius: radius.md, border: "none", cursor: "pointer",
                  background: "transparent",
                  opacity: isHidden ? 0.3 : 1,
                  transition: "all 0.2s ease",
                }}>
                  <span style={{
                    width: 16, height: 3,
                    background: avgColor, display: "inline-block", borderRadius: 1,
                  }} />
                  <span style={{
                    fontSize: font.size.xs,
                    color: isHidden ? colors.text.disabled : avgColor,
                    fontWeight: font.weight.bold,
                    textDecoration: isHidden ? "line-through" : "none",
                  }}>Media {year}</span>
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
            {/* Reset button — only show when some lines are manually hidden */}
            {hiddenLines.size > 0 && (
              <button onClick={() => setHiddenLines(new Set())} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                borderRadius: radius.md, border: `1px solid ${colors.border.default}`,
                cursor: "pointer", background: "transparent",
                transition: "all 0.15s ease",
              }}>
                <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>Reset</span>
              </button>
            )}
          </div>
        </div>
        );
      })()}

      {/* AI Report Modal */}
      {showReport && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}>
          <div style={{
            background: colors.bg.page, borderRadius: radius["4xl"],
            width: "100%", maxWidth: 600, maxHeight: "85vh",
            display: "flex", flexDirection: "column",
            boxShadow: shadows.xl, overflow: "hidden",
          }}>
            {/* Modal header */}
            <div style={{
              background: gradients.brandAlt, padding: "14px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={18} color={colors.text.inverse} />
                <div>
                  <div style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.inverse }}>
                    Report — {brand} {edition}
                  </div>
                  <div style={{ fontSize: font.size.xs, color: alpha.white[70] }}>
                    Powered by Gemini
                  </div>
                </div>
              </div>
              <button onClick={() => setShowReport(false)} style={{
                background: alpha.white[15], border: "none", borderRadius: radius.lg,
                padding: 6, cursor: "pointer", display: "flex",
              }}>
                <X size={16} color={colors.text.inverse} />
              </button>
            </div>
            {/* Modal body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {reportLoading && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: 40, color: colors.text.muted, fontSize: font.size.sm,
                }}>
                  <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Sto generando il report...
                </div>
              )}
              {reportText && (
                <>
                  {/* Visual report card for screenshot/share */}
                  <div ref={reportCardRef} style={{ padding: 20, background: "var(--bg-solid, #1e293b)" }}>
                    {/* Card header */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: colors.text.disabled, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                        Report Live Tracker
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: colors.text.primary }}>
                        {brand} <span style={{ color: colors.brand.purple }}>{edition}</span>
                      </div>
                      <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                        {eventDate ? eventDate.toLocaleDateString('it', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                        {' — '}{isEventPast ? 'Concluso' : `${currentDaysBefore} giorni all'evento`}
                      </div>
                    </div>

                    {/* KPI grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                      <div style={{ background: colors.bg.card, borderRadius: 12, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: colors.text.muted }}>Registrazioni</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: colors.brand.purple }}>{currentRegistrations}</div>
                      </div>
                      <div style={{ background: colors.bg.card, borderRadius: 12, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: colors.text.muted }}>Media storica</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: colors.text.primary }}>{effectiveAvgAtSamePoint}</div>
                      </div>
                      <div style={{ background: colors.bg.card, borderRadius: 12, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: colors.text.muted }}>{activeProjection != null ? 'Proiezione' : 'Delta'}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: activeProjection != null ? colors.status.success : (avgDelta > 0 ? colors.status.success : colors.status.error) }}>
                          {activeProjection != null ? `~${activeProjection}` : avgDelta != null ? `${avgDelta > 0 ? '+' : ''}${avgDelta}%` : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Mini chart — current edition vs average */}
                    <div style={{ marginBottom: 16, background: colors.bg.card, borderRadius: 12, padding: "12px 8px 4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 8, paddingRight: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: colors.text.muted }}>Curva cumulativa</span>
                        <div style={{ display: "flex", gap: 12, fontSize: 9 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 14, height: 3, borderRadius: 2, background: colors.chart[0], display: "inline-block" }} />
                            <span style={{ color: colors.text.muted }}>{edition}</span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 14, height: 2, borderRadius: 2, background: colors.text.disabled, display: "inline-block", borderTop: `1px dashed ${colors.text.disabled}` }} />
                            <span style={{ color: colors.text.muted }}>Media storica</span>
                          </span>
                        </div>
                      </div>
                      <div style={{ width: "100%", height: 160 }}>
                        <ResponsiveContainer width="100%" height={160}>
                          <AreaChart data={reportChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="2 8" stroke={colors.border.subtle} />
                            <XAxis dataKey="label" tick={{ fill: colors.text.disabled, fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: colors.text.disabled, fontSize: 9 }} axisLine={false} tickLine={false} />
                            <Area type="monotone" dataKey="media"
                              stroke={colors.text.disabled} fill={`${colors.text.disabled}10`}
                              strokeWidth={1.5} strokeDasharray="6 3"
                              dot={false} connectNulls />
                            <Area type="monotone" dataKey="current"
                              stroke={colors.chart[0]} fill={`${colors.chart[0]}20`}
                              strokeWidth={2.5}
                              dot={false} connectNulls />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* AI insights */}
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: colors.text.secondary }}
                      dangerouslySetInnerHTML={{ __html: formatReportMarkdown(reportText) }}
                    />

                    {/* Footer */}
                    <div style={{ marginTop: 16, paddingTop: 8, borderTop: `1px solid ${colors.border.subtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: colors.text.disabled }}>
                        Ultranalytics — {new Date().toLocaleDateString('it', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontSize: 10, color: colors.text.disabled }}>Powered by Gemini AI</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Modal footer */}
            {reportText && !reportLoading && (
              <div style={{
                padding: "12px 20px", borderTop: `1px solid ${colors.border.default}`,
                display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
              }}>
                <button onClick={handleShareReport} disabled={shareLoading} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: radius.xl, fontSize: font.size.sm, fontWeight: font.weight.medium,
                  border: "none", cursor: shareLoading ? "wait" : "pointer",
                  background: gradients.brandAlt, color: colors.text.inverse,
                  transition: "all 0.15s ease", opacity: shareLoading ? 0.7 : 1,
                }}>
                  {shareLoading ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Share2 size={14} />}
                  Condividi
                </button>
                <button onClick={handleCopyReport} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: radius.xl, fontSize: font.size.sm, fontWeight: font.weight.medium,
                  border: `1px solid ${colors.border.default}`, cursor: "pointer",
                  background: reportCopied ? alpha.brand[15] : "transparent",
                  color: reportCopied ? colors.brand.purple : colors.text.primary,
                  transition: "all 0.15s ease",
                }}>
                  {reportCopied ? <Check size={14} /> : <Copy size={14} />}
                  {reportCopied ? "Copiato!" : "Copia testo"}
                </button>
                <button onClick={() => setShowReport(false)} style={{
                  padding: "8px 16px", borderRadius: radius.xl, fontSize: font.size.sm,
                  fontWeight: font.weight.medium, border: "none", cursor: "pointer",
                  background: colors.bg.elevated, color: colors.text.primary,
                }}>
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Format markdown text for report display
function formatReportMarkdown(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => {
      let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (formatted.startsWith('- ') || formatted.startsWith('* ')) {
        formatted = `<span style="color:${colors.brand.purple};margin-right:6px">•</span>${formatted.slice(2)}`;
        return `<div style="padding-left:12px;margin:2px 0">${formatted}</div>`;
      }
      if (formatted.startsWith('## ')) {
        return `<div style="font-weight:700;color:${colors.text.primary};font-size:14px;margin-top:16px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid ${colors.border.subtle}">${formatted.slice(3)}</div>`;
      }
      if (formatted.startsWith('# ')) {
        return `<div style="font-weight:800;color:${colors.text.primary};font-size:16px;margin-top:12px;margin-bottom:6px">${formatted.slice(2)}</div>`;
      }
      return formatted ? `<div style="margin:2px 0">${formatted}</div>` : '<div style="height:6px"></div>';
    })
    .join('');
}

// Main component - routes to correct view
export default function WhereAreWeNow({ comparisonData }) {
  if (!comparisonData) return null;

  if (comparisonData.isCrossBrand) {
    return <CrossBrandView comparisonData={comparisonData} />;
  }

  return <SingleBrandView comparisonData={comparisonData} />;
}
