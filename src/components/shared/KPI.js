import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { colors, font, radius, gradients, alpha, glass, shadows } from '../../config/designTokens';

export default function KPI({ icon: Icon, label, value, sub, color, primary, trend, trendSuffix }) {
  const hasTrend = trend != null && isFinite(trend);

  return (
    <motion.div
      whileHover={{ scale: 1.03, boxShadow: primary ? shadows.brandHover : shadows.md }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        background: primary ? gradients.primaryKpi : colors.bg.card,
        borderRadius: radius["2xl"], padding: "14px 16px",
        border: primary ? `1px solid ${alpha.brand[40]}` : `1px solid ${colors.border.default}`,
        ...glass.card,
        boxShadow: shadows.sm,
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon size={14} color={color} />
        <span style={presets_statLabel_upper}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: primary ? font.size["4xl"] : font.size["3xl"], fontWeight: font.weight.bold, color: colors.text.primary }}>{value}</div>
        {hasTrend && <TrendBadge value={trend} suffix={trendSuffix} />}
      </div>
      {sub && <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 2 }}>{sub}</div>}
    </motion.div>
  );
}

function TrendBadge({ value, suffix = "%" }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isNeutral ? colors.text.disabled : isPositive ? colors.status.success : colors.status.error;
  const bgColor = isNeutral ? "rgba(100,116,139,0.1)" : isPositive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 6px", borderRadius: radius.md,
      background: bgColor, fontSize: 10, fontWeight: font.weight.semibold,
      color: trendColor, whiteSpace: "nowrap",
    }}>
      <TrendIcon size={10} />
      {isPositive ? "+" : ""}{value}{suffix}
    </div>
  );
}

const presets_statLabel_upper = {
  fontSize: font.size.xs,
  color: colors.text.muted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
