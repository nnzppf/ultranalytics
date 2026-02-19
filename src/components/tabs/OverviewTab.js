import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp } from 'lucide-react';
import Section from '../shared/Section';
import ResizeHandle from '../shared/ResizeHandle';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';
import { getHourlyData, getHourlyDataByGroup } from '../../utils/dataTransformers';

export default function OverviewTab({ analytics, filtered, selectedBrand, graphHeights, setGraphHeights }) {
  const [timeGranularity, setTimeGranularity] = useState('hourly');
  const [stackedView, setStackedView] = useState(false);

  const { dowData, daysBeforeData, multiEvent } = analytics;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Registrazioni per ora */}
      <Section
        title="Registrazioni per ora del giorno"
        extra={
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {granButtons.map(b => (
              <button key={b.key} onClick={() => setTimeGranularity(b.key)} style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
                background: timeGranularity === b.key ? "#8b5cf6" : "#334155",
                color: timeGranularity === b.key ? "#fff" : "#94a3b8",
              }}>{b.label}</button>
            ))}
            {hasStackableData && (
              <button onClick={() => setStackedView(v => !v)} style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
                background: stackedView ? "#8b5cf6" : "#334155",
                color: stackedView ? "#fff" : "#94a3b8", marginLeft: 8,
              }}>Stacked</button>
            )}
          </div>
        }
      >
        {hourlyPeak && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
            <TrendingUp size={12} color="#8b5cf6" />
            Picco: <strong style={{ color: "#f1f5f9" }}>{hourlyPeak.hour}</strong> con {hourlyPeak.registrazioni} registrazioni
          </div>
        )}
        <ResponsiveContainer width="100%" height={graphHeights.hourly || 250}>
          <BarChart data={stackedView && hourlyRegByEvent ? hourlyRegByEvent.data : hourlyReg}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9 }} interval={timeGranularity === '15min' ? 7 : timeGranularity === '30min' ? 3 : 1} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            {stackedView && hourlyRegByEvent
              ? hourlyRegByEvent.groups.map((g, i) => (
                  <Bar key={g} dataKey={g} stackId="a" fill={COLORS[i % COLORS.length]} maxBarSize={18} />
                ))
              : <Bar dataKey="registrazioni" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={18} />
            }
          </BarChart>
        </ResponsiveContainer>
        <ResizeHandle chartKey="hourly" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
      </Section>

      {/* Registrazioni per giorno */}
      <Section title="Registrazioni per giorno della settimana">
        <ResponsiveContainer width="100%" height={graphHeights.dowData || 220}>
          <BarChart data={dowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="giorno" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Registrazioni" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="partecipato" name="Presenze" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
        <ResizeHandle chartKey="dowData" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
      </Section>

      {/* Quando si registrano */}
      <Section title="Quando si registrano (giorni prima dell'evento)">
        <ResponsiveContainer width="100%" height={graphHeights.daysBeforeData || 220}>
          <AreaChart data={daysBeforeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="days" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-20} textAnchor="end" height={45} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="rgba(139,92,246,0.2)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <ResizeHandle chartKey="daysBeforeData" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
      </Section>
    </div>
  );
}
