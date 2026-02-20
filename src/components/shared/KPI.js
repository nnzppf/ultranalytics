import { colors, font, radius, gradients, alpha } from '../../config/designTokens';

export default function KPI({ icon: Icon, label, value, sub, color, primary }) {
  return (
    <div style={{
      background: primary ? gradients.primaryKpi : colors.bg.card,
      borderRadius: radius["2xl"], padding: "14px 16px",
      border: primary ? `1px solid ${alpha.brand[40]}` : `1px solid ${colors.border.default}`,
      transition: "transform 0.15s, box-shadow 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon size={14} color={color} />
        <span style={{ ...presets_statLabel_upper, }}>{label}</span>
      </div>
      <div style={{ fontSize: primary ? font.size["4xl"] : font.size["3xl"], fontWeight: font.weight.bold, color: colors.text.primary }}>{value}</div>
      {sub && <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const presets_statLabel_upper = {
  fontSize: font.size.xs,
  color: colors.text.muted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
