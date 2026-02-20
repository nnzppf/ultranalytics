import { colors, radius, spacing, presets } from '../../config/designTokens';

export default function Section({ title, children, extra }) {
  return (
    <div>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={presets.sectionLabel}>{title}</h3>
        {extra}
      </div>
      <div className="section-box" style={{
        background: colors.bg.card,
        borderRadius: radius["3xl"],
        padding: spacing[5],
        border: `1px solid ${colors.border.default}`,
      }}>{children}</div>
    </div>
  );
}
