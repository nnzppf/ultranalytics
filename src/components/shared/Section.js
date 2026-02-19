export default function Section({ title, children, extra }) {
  return (
    <div>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, margin: 0 }}>{title}</h3>
        {extra}
      </div>
      <div className="section-box" style={{ background: "#1e293b", borderRadius: 14, padding: 20, border: "1px solid #334155" }}>{children}</div>
    </div>
  );
}
