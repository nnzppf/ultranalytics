export default function Section({ title, children, extra }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, margin: 0 }}>{title}</h3>
        {extra}
      </div>
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, border: "1px solid #334155" }}>{children}</div>
    </div>
  );
}
