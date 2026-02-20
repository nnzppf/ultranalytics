import { colors, font, radius } from '../../config/designTokens';

const SEGMENT_STYLES = {
  vip: { bg: colors.segment.vip, color: colors.text.onDark, emoji: "\ud83d\udc51", label: "VIP" },
  fedeli: { bg: colors.segment.fedeli, color: colors.text.inverse, emoji: "\ud83d\udd04", label: "Fedeli" },
  ghost: { bg: colors.segment.ghost, color: colors.text.inverse, emoji: "\ud83d\udc7b", label: "Ghost" },
  occasionali: { bg: colors.segment.occasionali, color: colors.text.inverse, emoji: "\ud83c\udfaf", label: "Occasionale" },
};

export function SegmentBadge({ segment }) {
  const s = SEGMENT_STYLES[segment] || SEGMENT_STYLES.occasionali;
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: radius.md,
      padding: "2px 8px", fontSize: font.size.xs, fontWeight: font.weight.semibold,
    }}>
      {s.emoji} {s.label}
    </span>
  );
}

export function GenreBadge({ genre, color }) {
  return (
    <span style={{
      background: color || colors.bg.elevated, color: colors.text.inverse, borderRadius: radius.md,
      padding: "2px 8px", fontSize: font.size.xs, fontWeight: font.weight.semibold, textTransform: "capitalize",
    }}>
      {genre}
    </span>
  );
}

export function CategoryBadge({ category, color }) {
  return (
    <span style={{
      background: color || colors.bg.elevated, color: colors.text.inverse, borderRadius: radius.md,
      padding: "2px 8px", fontSize: font.size.xs, fontWeight: font.weight.semibold, textTransform: "capitalize",
    }}>
      {category}
    </span>
  );
}

export function DeltaBadge({ value, suffix = "%" }) {
  if (value === null || value === undefined) return <span style={{ color: colors.text.disabled }}>-</span>;
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span style={{
      color: isZero ? colors.text.muted : isPositive ? colors.status.success : colors.status.error,
      fontWeight: font.weight.semibold, fontSize: font.size.base,
    }}>
      {isPositive ? "+" : ""}{value}{suffix}
    </span>
  );
}
