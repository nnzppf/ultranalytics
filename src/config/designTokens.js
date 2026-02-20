/**
 * Ultranalytics Design System — Single source of truth for all visual tokens.
 * 2026 Redesign: Teal/Emerald + Amber, Glassmorphism, Warm Minimalism
 *
 * Usage:  import { colors, font, spacing, radius, shadows } from '../config/designTokens';
 *         style={{ background: colors.bg.page, fontSize: font.size.sm, padding: spacing[4] }}
 */

// ─── COLOR PALETTE ──────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds — via CSS custom properties for theme switching
  bg: {
    page:      "var(--bg-page)",
    card:      "var(--bg-card)",
    elevated:  "var(--bg-elevated)",
    hover:     "var(--bg-hover)",
    input:     "var(--bg-input)",
    solid:     "var(--bg-solid)",
  },

  // Text — via CSS custom properties for theme switching
  text: {
    primary:   "var(--text-primary)",
    secondary: "var(--text-secondary)",
    muted:     "var(--text-muted)",
    disabled:  "var(--text-disabled)",
    inverse:   "#ffffff",
    onDark:    "#000000",
  },

  // Borders — via CSS custom properties for theme switching
  border: {
    default:   "var(--border-default)",
    subtle:    "var(--border-subtle)",
    strong:    "var(--border-strong)",
    glass:     "rgba(255,255,255,0.08)",
  },

  // Brand / Primary — Teal + Amber
  brand: {
    purple:    "#0d9488",   // PRIMARY — teal (replaces purple everywhere)
    violet:    "#0f766e",   // deeper teal — gradient start
    pink:      "#ea580c",   // ACCENT — warm orange (replaces pink)
    cyan:      "#06b6d4",   // tertiary accent — kept
    lavender:  "#5eead4",   // light teal — suggestion text, soft accents
    lilac:     "#2dd4bf",   // medium teal — drag borders, hover accents
  },

  // Semantic / Status
  status: {
    success:   "#10b981",   // positive metrics, confirmed, presence
    error:     "#ef4444",   // negative metrics, no-show, destructive
    warning:   "#f59e0b",   // attention, today, caution
    info:      "#06b6d4",   // informational — teal tint
    errorLight: "#fca5a5",  // error text on dark backgrounds
  },

  // Segment badges
  segment: {
    vip:       "#fbbf24",
    fedeli:    "#0d9488",
    ghost:     "#475569",
    occasionali: "#06b6d4",
  },

  // External brand colors
  whatsapp:    "#25D366",

  // Overlays
  overlay: {
    dark:      "rgba(0,0,0,0.7)",
    medium:    "rgba(0,0,0,0.6)",
    light:     "rgba(0,0,0,0.4)",
  },

  // Interactive states — via CSS vars for theme switching
  interactive: {
    active:      "#0d9488",   // teal active
    inactive:    "var(--interactive-inactive)",
    activeText:  "#ffffff",
    inactiveText: "var(--interactive-inactive-text)",
  },

  // Chart palette (ordered for visual distinction — teal-first)
  chart: [
    "#0d9488", "#ea580c", "#06b6d4", "#f59e0b", "#10b981",
    "#ef4444", "#3b82f6", "#f97316", "#14b8a6", "#8b5cf6",
  ],

  // Fasce orarie (ordered: notte, mattina, pomeriggio, sera)
  fasce: ["#0f766e", "#f59e0b", "#06b6d4", "#ea580c"],

  // Heatmap
  heatmap: {
    empty:     "var(--heatmap-empty)",
  },
};

// ─── ALPHA / OPACITY UTILITIES ─────────────────────────────────────────────────

export const alpha = {
  brand: {
    6:  "rgba(13,148,136,0.06)",  // very subtle teal background
    8:  "rgba(13,148,136,0.08)",  // highlighted card background
    15: "rgba(13,148,136,0.15)",  // selected state background
    20: "rgba(13,148,136,0.2)",   // border subtle
    30: "rgba(13,148,136,0.3)",   // border visible
    40: "rgba(13,148,136,0.4)",   // strong accent border
    50: "rgba(13,148,136,0.5)",   // focus ring
  },
  pink: {
    8:  "rgba(234,88,12,0.08)",   // warm orange highlight background
    10: "rgba(234,88,12,0.1)",    // gradient end
    30: "rgba(234,88,12,0.3)",    // orange border
  },
  error: {
    10: "rgba(239,68,68,0.1)",
    15: "rgba(239,68,68,0.15)",
    30: "rgba(239,68,68,0.3)",
  },
  success: {
    15: "rgba(16,185,129,0.15)",
  },
  white: {
    15: "rgba(255,255,255,0.15)",
    20: "rgba(255,255,255,0.2)",
    70: "rgba(255,255,255,0.7)",
    80: "rgba(255,255,255,0.8)",
  },
};

// ─── GLASS EFFECTS ──────────────────────────────────────────────────────────────

export const glass = {
  card:    { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" },
  heavy:   { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  light:   { backdropFilter: "blur(8px)",  WebkitBackdropFilter: "blur(8px)" },
};

// ─── GRADIENTS ──────────────────────────────────────────────────────────────────

export const gradients = {
  brand:     "linear-gradient(135deg, #0f766e, #ea580c)",
  brandAlt:  "linear-gradient(135deg, #0f766e, #06b6d4)",
  progress:  "linear-gradient(90deg, #0d9488, #10b981)",
  primaryKpi: `linear-gradient(135deg, ${alpha.brand[15]}, ${alpha.pink[10]})`,
  highlight: `linear-gradient(90deg, ${alpha.brand[15]}, ${alpha.pink[10]})`,
};

// ─── TYPOGRAPHY ─────────────────────────────────────────────────────────────────

export const font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  size: {
    xs:   11,
    sm:   12,
    base: 13,
    md:   14,
    lg:   16,
    xl:   18,
    "2xl": 20,
    "3xl": 22,
    "4xl": 28,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold:   700,
    black:  800,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
};

// ─── SPACING (4px base unit) ────────────────────────────────────────────────────

export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
};

// ─── BORDER RADIUS ──────────────────────────────────────────────────────────────

export const radius = {
  sm:   4,
  md:   6,
  lg:   8,
  xl:   12,    // slightly larger
  "2xl": 16,   // standard cards — more rounded
  "3xl": 20,   // large cards
  "4xl": 24,   // modals, panels
  full: 9999,
};

// ─── SHADOWS ────────────────────────────────────────────────────────────────────

export const shadows = {
  none:    "none",
  sm:      "0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
  md:      "0 4px 20px rgba(0,0,0,0.2), 0 0 1px rgba(255,255,255,0.05)",
  lg:      "0 10px 40px rgba(0,0,0,0.3), 0 0 1px rgba(255,255,255,0.05)",
  xl:      "0 20px 60px rgba(0,0,0,0.4)",
  brand:   "0 4px 20px rgba(13,148,136,0.3)",
  brandHover: "0 6px 30px rgba(13,148,136,0.5)",
  glow:    "0 0 20px rgba(13,148,136,0.15)",   // subtle glow for active states
};

// ─── TRANSITIONS ────────────────────────────────────────────────────────────────

export const transition = {
  fast:    "all 0.1s ease",
  normal:  "all 0.15s ease",
  slow:    "all 0.3s ease",
  spring:  "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",  // bouncy
};

// ─── COMMON STYLE PRESETS ───────────────────────────────────────────────────────

export const presets = {
  sectionLabel: {
    fontSize: font.size.sm,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: font.weight.semibold,
    margin: 0,
  },

  statLabel: {
    fontSize: font.size.xs,
    color: colors.text.disabled,
  },

  filterButton: {
    padding: "5px 12px",
    borderRadius: radius.lg,
    fontSize: font.size.xs,
    border: "none",
    cursor: "pointer",
    fontWeight: font.weight.medium,
    transition: transition.normal,
  },

  // Glass card — the new default
  card: {
    background: colors.bg.card,
    borderRadius: radius["2xl"],
    padding: spacing[5],
    border: `1px solid ${colors.border.default}`,
    ...glass.card,
    boxShadow: shadows.sm,
  },

  // Compact glass card
  cardCompact: {
    background: colors.bg.card,
    borderRadius: radius.xl,
    padding: `${spacing[3]}px ${spacing[4]}px`,
    border: `1px solid ${colors.border.default}`,
    ...glass.light,
  },
};
