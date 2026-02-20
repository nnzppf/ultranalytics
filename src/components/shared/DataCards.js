import { colors, font, radius, glass, shadows } from '../../config/designTokens';

/**
 * DataCards — renders data as cards on mobile, hidden on desktop.
 * Use alongside the existing <table> which gets className="desktop-table".
 *
 * Props:
 *   items: array of data objects
 *   fields: [{ key, label, render?, primary?, badge? }]
 *     - primary: shown as card title (larger)
 *     - badge: rendered inline next to title
 *     - render: custom render fn(item) → ReactNode
 *   onItemClick: (item) => void
 *   keyExtractor: (item, index) => string
 */
export default function DataCards({ items, fields, onItemClick, keyExtractor }) {
  const primaryField = fields.find(f => f.primary);
  const badgeField = fields.find(f => f.badge);
  const detailFields = fields.filter(f => !f.primary && !f.badge);

  return (
    <div className="mobile-cards">
      {items.map((item, i) => (
        <div
          key={keyExtractor ? keyExtractor(item, i) : i}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          style={{
            background: colors.bg.card,
            borderRadius: radius.xl,
            padding: "12px 14px",
            border: `1px solid ${colors.border.default}`,
            ...glass.card,
            boxShadow: shadows.sm,
            cursor: onItemClick ? "pointer" : "default",
          }}
        >
          {/* Header: primary field + badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text.primary }}>
              {primaryField?.render ? primaryField.render(item) : (primaryField ? item[primaryField.key] : '')}
            </span>
            {badgeField && (
              <span>{badgeField.render ? badgeField.render(item) : item[badgeField.key]}</span>
            )}
          </div>
          {/* Detail fields as 2-col grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            {detailFields.map(f => (
              <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
                <span style={{ fontSize: 11, color: colors.text.disabled }}>{f.label}</span>
                <span style={{ fontSize: font.size.xs, fontWeight: font.weight.medium, color: f.color ? f.color(item) : colors.text.primary }}>
                  {f.render ? f.render(item) : item[f.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
