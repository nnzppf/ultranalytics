import { useState } from 'react';
import HeatmapTab from './HeatmapTab';
import FasceTab from './FasceTab';
import TrendsTab from './TrendsTab';
import Dropdown from '../shared/Dropdown';
import { colors, font, radius, transition as tr } from '../../config/designTokens';

const subTabs = [
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'fasce', label: 'Fasce Orarie' },
  { key: 'trend', label: 'Trend' },
];

export default function AnalisiTemporaleTab({
  heatmapGrid, fasciaData, convByFascia,
  trendData, trendByGroup, multiEvent,
  graphHeights, setGraphHeights,
}) {
  const [view, setView] = useState('heatmap');

  return (
    <div>
      {/* Desktop sub-tabs */}
      <div className="desktop-analisi-subtabs" style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            padding: "6px 14px", borderRadius: radius.lg, fontSize: font.size.sm, border: "none", cursor: "pointer",
            background: view === t.key ? colors.interactive.active : colors.bg.card,
            color: view === t.key ? colors.interactive.activeText : colors.interactive.inactiveText,
            fontWeight: view === t.key ? font.weight.semibold : font.weight.medium,
            transition: tr.normal,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Mobile dropdown */}
      <div className="mobile-analisi-subtabs" style={{ display: "none", marginBottom: 16 }}>
        <Dropdown
          value={view}
          onChange={setView}
          placeholder="Analisi"
          options={subTabs.map(t => ({ value: t.key, label: t.label }))}
        />
      </div>

      {/* Content */}
      {view === 'heatmap' && <HeatmapTab heatmapGrid={heatmapGrid} />}
      {view === 'fasce' && (
        <FasceTab
          fasciaData={fasciaData}
          convByFascia={convByFascia}
          graphHeights={graphHeights}
          setGraphHeights={setGraphHeights}
        />
      )}
      {view === 'trend' && (
        <TrendsTab
          trendData={trendData}
          trendByGroup={trendByGroup}
          multiEvent={multiEvent}
        />
      )}
    </div>
  );
}
