import { colors, radius, spacing, shadows, glass, presets } from '../../config/designTokens';

export default function Section({ title, children, extra }) {
  return (
    <div>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, minHeight: 30 }}>
        <h3 style={presets.sectionLabel}>{title}</h3>
        {extra}
      </div>
      <div className="section-box" style={{
        background: colors.bg.card,
        borderRadius: radius["3xl"],
        padding: spacing[5],
        border: `1px solid ${colors.border.default}`,
        ...glass.card,
        boxShadow: shadows.sm,
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = shadows.glow; e.currentTarget.style.borderColor = "rgba(13,148,136,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = shadows.sm; e.currentTarget.style.borderColor = ""; }}
      >{children}</div>
    </div>
  );
}
