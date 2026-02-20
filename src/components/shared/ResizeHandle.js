import { colors, font } from '../../config/designTokens';

export default function ResizeHandle({ chartKey, graphHeights, setGraphHeights }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 }}>
      <span style={{ fontSize: font.size.xs, color: colors.border.strong }}>Altezza</span>
      <input
        type="range" min={150} max={600}
        value={graphHeights[chartKey] || 250}
        onChange={e => setGraphHeights(prev => ({ ...prev, [chartKey]: parseInt(e.target.value) }))}
        style={{ flex: 1, accentColor: colors.brand.purple, height: 3 }}
      />
    </div>
  );
}
