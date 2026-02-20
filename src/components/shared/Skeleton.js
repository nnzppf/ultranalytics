import { colors, radius } from '../../config/designTokens';

export function SkeletonBlock({ width = "100%", height = 16, style }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: radius.md, ...style }} />
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ padding: "0 20px" }}>
      {/* KPI skeleton row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: "16px 0", marginBottom: 8 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            background: colors.bg.card, borderRadius: 16, padding: "14px 16px",
            border: `1px solid ${colors.border.default}`,
          }}>
            <SkeletonBlock width={60} height={10} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={80} height={24} />
          </div>
        ))}
      </div>

      {/* Tab skeleton */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[90, 70, 100, 60, 80, 55, 90].map((w, i) => (
          <SkeletonBlock key={i} width={w} height={34} style={{ borderRadius: 8 }} />
        ))}
      </div>

      {/* Chart skeleton — bento */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "1 / -1", background: colors.bg.card, borderRadius: 20, padding: 16, border: `1px solid ${colors.border.default}` }}>
          <SkeletonBlock width={200} height={10} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={180} />
        </div>
        <div style={{ background: colors.bg.card, borderRadius: 20, padding: 16, border: `1px solid ${colors.border.default}` }}>
          <SkeletonBlock width={180} height={10} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={150} />
        </div>
        <div style={{ background: colors.bg.card, borderRadius: 20, padding: 16, border: `1px solid ${colors.border.default}` }}>
          <SkeletonBlock width={160} height={10} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={150} />
        </div>
      </div>
    </div>
  );
}
