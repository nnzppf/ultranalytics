export default function KPI({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 12, padding: "14px 16px", border: "1px solid #334155" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
