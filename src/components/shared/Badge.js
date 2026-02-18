const SEGMENT_STYLES = {
  vip: { bg: "#fbbf24", color: "#000", emoji: "\ud83d\udc51", label: "VIP" },
  fedeli: { bg: "#8b5cf6", color: "#fff", emoji: "\ud83d\udd04", label: "Fedeli" },
  ghost: { bg: "#475569", color: "#fff", emoji: "\ud83d\udc7b", label: "Ghost" },
  occasionali: { bg: "#06b6d4", color: "#fff", emoji: "\ud83c\udfaf", label: "Occasionale" },
};

export function SegmentBadge({ segment }) {
  const s = SEGMENT_STYLES[segment] || SEGMENT_STYLES.occasionali;
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 6,
      padding: "2px 8px", fontSize: 10, fontWeight: 600,
    }}>
      {s.emoji} {s.label}
    </span>
  );
}

export function GenreBadge({ genre, color }) {
  return (
    <span style={{
      background: color || "#334155", color: "#fff", borderRadius: 6,
      padding: "2px 8px", fontSize: 10, fontWeight: 600, textTransform: "capitalize",
    }}>
      {genre}
    </span>
  );
}

export function CategoryBadge({ category, color }) {
  return (
    <span style={{
      background: color || "#334155", color: "#fff", borderRadius: 6,
      padding: "2px 8px", fontSize: 10, fontWeight: 600, textTransform: "capitalize",
    }}>
      {category}
    </span>
  );
}

export function DeltaBadge({ value, suffix = "%" }) {
  if (value === null || value === undefined) return <span style={{ color: "#64748b" }}>-</span>;
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span style={{
      color: isZero ? "#94a3b8" : isPositive ? "#10b981" : "#ef4444",
      fontWeight: 600, fontSize: 13,
    }}>
      {isPositive ? "+" : ""}{value}{suffix}
    </span>
  );
}
