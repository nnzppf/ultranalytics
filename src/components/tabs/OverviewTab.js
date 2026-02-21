import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp } from 'lucide-react';
import Section from '../shared/Section';
import ResizeHandle from '../shared/ResizeHandle';
import ScaleToggle from '../shared/ScaleToggle';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';
import { colors, font, radius, alpha, transition as tr } from '../../config/designTokens';
import { getHourlyData, getHourlyDataByGroup, getYearlyAvgCurves } from '../../utils/dataTransformers';
import { FadeIn } from '../shared/Motion';

export default function OverviewTab({ analytics, filtered, selectedBrand, graphHeights, setGraphHeights }) {
  const [timeGranularity, setTimeGranularity] = useState('hourly');
  const [stackedView, setStackedView] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [logScaleYearly, setLogScaleYearly] = useState(false);
  const [hiddenYears, setHiddenYears] = useState(new Set());
  const [yearlyView, setYearlyView] = useState('curve'); // 'curve' | 'barre'

  const { dowData, daysBeforeData, multiEvent, eventStats } = analytics;

  // Yearly average cumulative curves
  const yearlyAvg = useMemo(() => {
    if (!filtered || !filtered.length) return { data: [], years: [] };
    return getYearlyAvgCurves(filtered);
  }, [filtered]);

  const toggleYear = (year) => {
    setHiddenYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  // Yearly bar data: avg registrations + avg conversion per year
  const yearlyBarData = useMemo(() => {
    if (!eventStats || !eventStats.length) return [];
    const byYear = {};
    for (const ev of eventStats) {
      if (!ev.eventDate) continue;
      const year = ev.eventDate.getFullYear();
      if (!byYear[year]) byYear[year] = { year, totalReg: 0, totalEnt: 0, editions: 0 };
      byYear[year].totalReg += ev.registrations;
      byYear[year].totalEnt += ev.entries;
      byYear[year].editions++;
    }
    return Object.values(byYear).sort((a, b) => a.year - b.year).map(y => ({
      year: String(y.year),
      mediaReg: Math.round(y.totalReg / y.editions),
      mediaPresenze: Math.round(y.totalEnt / y.editions),
      conv: y.totalReg > 0 ? parseFloat(((y.totalEnt / y.totalReg) * 100).toFixed(1)) : 0,
      edizioni: y.editions,
    }));
  }, [eventStats]);

  // Recalculate hourly data when granularity changes
  const groupKey = selectedBrand !== "all" ? 'editionLabel' : 'brand';

  const hourlyReg = useMemo(() => {
    if (!filtered || !filtered.length) return analytics.hourlyReg;
    return getHourlyData(filtered, timeGranularity);
  }, [filtered, timeGranularity, analytics.hourlyReg]);

  const hourlyRegByEvent = useMemo(() => {
    if (!filtered || !filtered.length) return analytics.hourlyRegByEvent;
    return getHourlyDataByGroup(filtered, groupKey, timeGranularity);
  }, [filtered, groupKey, timeGranularity, analytics.hourlyRegByEvent]);

  const hourlyPeak = useMemo(() => {
    if (!hourlyReg || !hourlyReg.length) return null;
    return hourlyReg.reduce((max, h) => h.registrazioni > (max?.registrazioni || 0) ? h : max, null);
  }, [hourlyReg]);

  // Show stacked if multiple brands OR single brand with multiple editions (groups in byEvent data)
  const hasStackableData = multiEvent || (hourlyRegByEvent && hourlyRegByEvent.groups && hourlyRegByEvent.groups.length > 1);

  const granButtons = [
    { key: 'hourly', label: 'Oraria' },
    { key: '30min', label: '30min' },
    { key: '15min', label: '15min' },
  ];

  return (
    <div className="bento-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
      {/* Andamento registrazioni per anno — full width */}
      {yearlyAvg.years.length > 0 && (
        <FadeIn style={{ gridColumn: "1 / -1" }}><Section
          title="Andamento registrazioni per anno"
          extra={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {['curve', 'barre'].map(v => (
                <button key={v} onClick={() => setYearlyView(v)} style={{
                  padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs, border: "none", cursor: "pointer",
                  background: yearlyView === v ? colors.interactive.active : colors.interactive.inactive,
                  color: yearlyView === v ? colors.interactive.activeText : colors.interactive.inactiveText,
                  transition: tr.normal, fontWeight: font.weight.medium,
                }}>{v === 'curve' ? 'Curve' : 'Barre'}</button>
              ))}
              {yearlyView === 'curve' && <ScaleToggle isLog={logScaleYearly} onToggle={setLogScaleYearly} />}
            </div>
          }
        >
          {yearlyView === 'curve' ? (
            <>
              <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 8 }}>
                Media registrazioni cumulative per edizione, raggruppate per anno
              </div>
              <ResponsiveContainer width="100%" height={graphHeights.yearlyAvg || 260}>
                <AreaChart data={logScaleYearly ? yearlyAvg.data.map(d => {
                  const pt = { ...d };
                  for (const y of yearlyAvg.years) { if (pt[y] === 0) pt[y] = null; }
                  return pt;
                }) : yearlyAvg.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
                  <XAxis dataKey="day" tick={{ fill: colors.text.muted, fontSize: 10 }} />
                  <YAxis scale={logScaleYearly ? "log" : "auto"} domain={logScaleYearly ? [1, "auto"] : [0, "auto"]} allowDataOverflow={logScaleYearly} tick={{ fill: colors.text.muted, fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  {yearlyAvg.years.map((year, i) => {
                    if (hiddenYears.has(year)) return null;
                    const isCurrent = year === yearlyAvg.years[yearlyAvg.years.length - 1];
                    return (
                      <Area
                        key={year}
                        type="monotone"
                        dataKey={year}
                        stroke={COLORS[i % COLORS.length]}
                        fill={isCurrent ? `${COLORS[i % COLORS.length]}22` : "transparent"}
                        strokeWidth={isCurrent ? 3 : 2}
                        dot={false}
                        connectNulls
                        name={year}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
              {/* Clickable year legend */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                {yearlyAvg.years.map((year, i) => {
                  const isHidden = hiddenYears.has(year);
                  return (
                    <button key={year} onClick={() => toggleYear(year)} style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                      borderRadius: radius.md, border: "none", cursor: "pointer",
                      background: "transparent", opacity: isHidden ? 0.3 : 1, transition: "all 0.2s ease",
                    }}>
                      <span style={{
                        width: 12, height: 3, display: "inline-block", borderRadius: 2,
                        background: COLORS[i % COLORS.length],
                      }} />
                      <span style={{
                        fontSize: font.size.xs,
                        color: isHidden ? colors.text.disabled : colors.text.muted,
                        fontWeight: font.weight.medium,
                        textDecoration: isHidden ? "line-through" : "none",
                      }}>{year}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 8 }}>
                Media registrazioni e presenze per edizione · tra parentesi il numero di edizioni
              </div>
              <ResponsiveContainer width="100%" height={graphHeights.yearlyAvg || 260}>
                <BarChart data={yearlyBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
                  <XAxis dataKey="year" tick={{ fill: colors.text.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: colors.text.muted, fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(value, name) => {
                    if (name === 'conv') return [`${value}%`, 'Conversione'];
                    return [value, name === 'mediaReg' ? 'Media reg.' : 'Media presenze'];
                  }} />
                  <Bar dataKey="mediaReg" name="Media reg." fill={colors.brand.purple} radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="mediaPresenze" name="Media presenze" fill={colors.status.success} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
              {/* Year stats */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                {yearlyBarData.map(y => (
                  <span key={y.year} style={{ fontSize: font.size.xs, color: colors.text.muted }}>
                    {y.year}: <strong style={{ color: colors.text.primary }}>{y.mediaReg}</strong> reg/ed · <strong style={{ color: colors.status.success }}>{y.conv}%</strong> conv · ({y.edizioni} ed.)
                  </span>
                ))}
              </div>
            </>
          )}
          <ResizeHandle chartKey="yearlyAvg" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
        </Section></FadeIn>
      )}

      {/* Registrazioni per ora — full width */}
      <FadeIn style={{ gridColumn: "1 / -1" }}><Section
        title="Registrazioni per ora del giorno"
        extra={
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {granButtons.map(b => (
              <button key={b.key} onClick={() => setTimeGranularity(b.key)} style={{
                padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs, border: "none", cursor: "pointer",
                background: timeGranularity === b.key ? colors.interactive.active : colors.interactive.inactive,
                color: timeGranularity === b.key ? colors.interactive.activeText : colors.interactive.inactiveText, transition: tr.normal,
              }}>{b.label}</button>
            ))}
            {hasStackableData && (
              <button onClick={() => setStackedView(v => !v)} style={{
                padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs, border: "none", cursor: "pointer",
                background: stackedView ? colors.interactive.active : colors.interactive.inactive,
                color: stackedView ? colors.interactive.activeText : colors.text.muted, marginLeft: 8,
                transition: tr.normal,
              }}>Stacked</button>
            )}
          </div>
        }
      >
        {hourlyPeak && (
          <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
            <TrendingUp size={12} color={colors.brand.purple} />
            Picco: <strong style={{ color: colors.text.primary }}>{hourlyPeak.hour}</strong> con {hourlyPeak.registrazioni} registrazioni
          </div>
        )}
        <ResponsiveContainer width="100%" height={graphHeights.hourly || 250}>
          <BarChart data={stackedView && hourlyRegByEvent ? hourlyRegByEvent.data : hourlyReg}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
            <XAxis dataKey="hour" tick={{ fill: colors.text.muted, fontSize: 9 }} interval={timeGranularity === '15min' ? 7 : timeGranularity === '30min' ? 3 : 1} />
            <YAxis tick={{ fill: colors.text.muted, fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            {stackedView && hourlyRegByEvent
              ? hourlyRegByEvent.groups.map((g, i) => (
                  <Bar key={g} dataKey={g} stackId="a" fill={COLORS[i % COLORS.length]} maxBarSize={18} />
                ))
              : <Bar dataKey="registrazioni" fill={colors.brand.purple} radius={[4, 4, 0, 0]} maxBarSize={18} />
            }
          </BarChart>
        </ResponsiveContainer>
        <ResizeHandle chartKey="hourly" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
      </Section></FadeIn>

      {/* Registrazioni per giorno — half width */}
      <FadeIn delay={0.1}><Section title="Registrazioni per giorno della settimana">
        <ResponsiveContainer width="100%" height={graphHeights.dowData || 220}>
          <BarChart data={dowData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
            <XAxis dataKey="giorno" tick={{ fill: colors.text.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: colors.text.muted, fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Registrazioni" fill={colors.brand.purple} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="partecipato" name="Presenze" fill={colors.status.success} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
        <ResizeHandle chartKey="dowData" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
      </Section></FadeIn>

      {/* Quando si registrano — half width */}
      <FadeIn delay={0.15}><Section
        title="Quando si registrano (giorni prima dell'evento)"
        extra={<ScaleToggle isLog={logScale} onToggle={setLogScale} />}
      >
        <ResponsiveContainer width="100%" height={graphHeights.daysBeforeData || 220}>
          <AreaChart data={logScale ? daysBeforeData.map(d => ({ ...d, count: d.count || null })) : daysBeforeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border.default} />
            <XAxis dataKey="days" tick={{ fill: colors.text.muted, fontSize: 10 }} angle={-20} textAnchor="end" height={45} />
            <YAxis scale={logScale ? "log" : "auto"} domain={logScale ? [1, "auto"] : [0, "auto"]} allowDataOverflow={logScale} tick={{ fill: colors.text.muted, fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="count" stroke={colors.brand.purple} fill={alpha.brand[20]} strokeWidth={2} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
        <ResizeHandle chartKey="daysBeforeData" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
      </Section></FadeIn>
    </div>
  );
}
