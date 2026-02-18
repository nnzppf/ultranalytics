export default function ResizeHandle({ chartKey, graphHeights, setGraphHeights }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 }}>
      <span style={{ fontSize: 10, color: "#475569" }}>Altezza</span>
      <input
        type="range" min={150} max={600}
        value={graphHeights[chartKey] || 250}
        onChange={e => setGraphHeights(prev => ({ ...prev, [chartKey]: parseInt(e.target.value) }))}
        style={{ flex: 1, accentColor: "#8b5cf6", height: 3 }}
      />
    </div>
  );
}
