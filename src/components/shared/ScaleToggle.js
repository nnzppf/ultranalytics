import { colors, font, radius, transition as tr } from '../../config/designTokens';

export default function ScaleToggle({ isLog, onToggle }) {
  return (
    <div style={{ display: "inline-flex", borderRadius: radius.lg, overflow: "hidden", border: `1px solid ${colors.border.default}` }}>
      {["Lineare", "Log"].map(label => {
        const active = label === "Log" ? isLog : !isLog;
        return (
          <button
            key={label}
            onClick={() => onToggle(label === "Log")}
            style={{
              padding: "4px 12px", fontSize: font.size.xs, fontWeight: font.weight.semibold,
              border: "none", cursor: "pointer", transition: tr.normal,
              background: active ? colors.brand.purple : "transparent",
              color: active ? colors.text.inverse : colors.text.muted,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
