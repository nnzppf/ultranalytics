/**
 * Ultranalytics Design System — Single source of truth for all visual tokens.
 *
 * Usage:  import { colors, font, spacing, radius, shadows } from '../config/designTokens';
 *         style={{ background: colors.bg.page, fontSize: font.size.sm, padding: spacing[4] }}
 */

// ─── COLOR PALETTE ──────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds (dark → light)
  bg: {
    page:      "#0f172a",   // deepest — full page background
    card:      "#1e293b",   // cards, sections, panels
    elevated:  "#334155",   // elevated elements — buttons, inputs, dropdowns
    hover:     "#3d4f6a",   // hover state on elevated elements
    input:     "#0f172a",   // text inputs, textareas
  },

  // Text (light → dark)
  text: {
    primary:   "#f1f5f9",   // headings, important text
    secondary: "#e2e8f0",   // body text, readable content
    muted:     "#94a3b8",   // labels, descriptions, secondary info
    disabled:  "#64748b",   // placeholders, disabled, tertiary
    inverse:   "#ffffff",   // text on colored backgrounds
    onDark:    "#000000",   // text on light/yellow backgrounds (VIP badge)
  },

  // Borders
  border: {
    default:   "#334155",   // standard card/section borders
    subtle:    "#1e293b",   // subtle separators within cards
    strong:    "#475569",   // emphasized borders (filter separator)
  },

  // Brand / Primary
  brand: {
    purple:    "#8b5cf6",   // primary actions, highlights, active states
    violet:    "#7c3aed",   // gradient start, deeper accent
    pink:      "#ec4899",   // secondary accent, gradient end
    cyan:      "#06b6d4",   // tertiary accent
    lavender:  "#c4b5fd",   // light purple — suggestion text, soft accents
    lilac:     "#a78bfa",   // medium purple — drag borders, hover accents
  },

  // Semantic / Status
  status: {
    success:   "#10b981",   // positive metrics, confirmed, presence
    error:     "#ef4444",   // negative metrics, no-show, destructive
    warning:   "#f59e0b",   // attention, today, caution
    info:      "#3b82f6",   // informational
    errorLight: "#fca5a5",  // error text on dark backgrounds (e.g. error messages)
  },

  // Segment badges
  segment: {
    vip:       "#fbbf24",
    fedeli:    "#8b5cf6",
    ghost:     "#475569",
    occasionali: "#06b6d4",
  },

  // External brand colors
  whatsapp:    "#25D366",

  // Overlays
  overlay: {
    dark:      "rgba(0,0,0,0.7)",     // modal backdrop
    medium:    "rgba(0,0,0,0.6)",     // lighter modal backdrop
    light:     "rgba(0,0,0,0.4)",     // subtle overlays
  },

  // Interactive states
  interactive: {
    active:    "#8b5cf6",   // active filter/tab background
    inactive:  "#334155",   // inactive filter/tab background
    activeText:  "#ffffff",
    inactiveText: "#cbd5e1", // improved contrast for inactive buttons
  },

  // Chart palette (ordered for visual distinction)
  chart: [
    "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#10b981",
    "#ef4444", "#3b82f6", "#f97316", "#14b8a6", "#a855f7",
  ],

  // Fasce orarie (ordered: notte, mattina, pomeriggio, sera)
  fasce: ["#6366f1", "#f59e0b", "#06b6d4", "#ec4899"],

  // Heatmap
  heatmap: {
    empty:     "#1a1a2e",   // empty heatmap cell
  },
};

// ─── ALPHA / OPACITY UTILITIES ─────────────────────────────────────────────────

/**
 * Pre-computed rgba() values for commonly used brand/status colors with opacity.
 * Use these instead of inline rgba() to keep the design system centralized.
 */
export const alpha = {
  brand: {
    6:  "rgba(139,92,246,0.06)",  // very subtle background
    8:  "rgba(139,92,246,0.08)",  // highlighted card background
    15: "rgba(139,92,246,0.15)",  // selected state background
    20: "rgba(139,92,246,0.2)",   // border subtle
    30: "rgba(139,92,246,0.3)",   // border visible
    40: "rgba(139,92,246,0.4)",   // strong accent border
    50: "rgba(139,92,246,0.5)",   // focus ring
  },
  pink: {
    8:  "rgba(236,72,153,0.08)",  // pink highlight background
    10: "rgba(236,72,153,0.1)",   // gradient end
    30: "rgba(236,72,153,0.3)",   // pink border
  },
  error: {
    10: "rgba(239,68,68,0.1)",    // error background
    15: "rgba(239,68,68,0.15)",   // error message background
    30: "rgba(239,68,68,0.3)",    // error border
  },
  success: {
    15: "rgba(16,185,129,0.15)",  // success background
  },
  white: {
    15: "rgba(255,255,255,0.15)", // white overlay on gradient headers
    20: "rgba(255,255,255,0.2)",  // white overlay stronger
    70: "rgba(255,255,255,0.7)",  // subdued white text on gradients
    80: "rgba(255,255,255,0.8)",  // brighter white text on gradients
  },
};

// ─── GRADIENTS ──────────────────────────────────────────────────────────────────

export const gradients = {
  brand:     "linear-gradient(135deg, #7c3aed, #ec4899)",
  brandAlt:  "linear-gradient(135deg, #7c3aed, #06b6d4)",
  progress:  "linear-gradient(90deg, #8b5cf6, #ec4899)",
  primaryKpi: `linear-gradient(135deg, ${alpha.brand[15]}, ${alpha.pink[10]})`,
  highlight: `linear-gradient(90deg, ${alpha.brand[15]}, ${alpha.pink[10]})`,
};

// ─── TYPOGRAPHY ─────────────────────────────────────────────────────────────────

export const font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  size: {
    xs:   11,   // minimum readable — captions, labels, badges
    sm:   12,   // secondary text, table content, filter buttons
    base: 13,   // body text, descriptions, inputs
    md:   14,   // emphasized body, modal titles
    lg:   16,   // card titles, section values
    xl:   18,   // stat values, sub-headings
    "2xl": 20,  // page-level headings
    "3xl": 22,  // KPI values
    "4xl": 28,  // primary KPI value
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
  sm:   4,    // tiny badges, tags
  md:   6,    // small buttons, chips
  lg:   8,    // buttons, inputs, filter chips
  xl:   10,   // cards in compact spaces
  "2xl": 12,  // standard cards, sections
  "3xl": 14,  // large cards (birthday KPI)
  "4xl": 16,  // modals, panels
  full: 9999, // pills, circular
};

// ─── SHADOWS ────────────────────────────────────────────────────────────────────

export const shadows = {
  none:    "none",
  sm:      "0 2px 8px rgba(0,0,0,0.2)",
  md:      "0 4px 20px rgba(0,0,0,0.3)",
  lg:      "0 10px 40px rgba(0,0,0,0.4)",
  xl:      "0 20px 60px rgba(0,0,0,0.5)",
  brand:   "0 4px 20px rgba(124,58,237,0.4)",
  brandHover: "0 6px 30px rgba(124,58,237,0.6)",
};

// ─── TRANSITIONS ────────────────────────────────────────────────────────────────

export const transition = {
  fast:    "all 0.1s ease",
  normal:  "all 0.15s ease",
  slow:    "all 0.3s ease",
};

// ─── COMMON STYLE PRESETS ───────────────────────────────────────────────────────

export const presets = {
  // Section header label style
  sectionLabel: {
    fontSize: font.size.sm,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: font.weight.semibold,
    margin: 0,
  },

  // Stat label (above a number)
  statLabel: {
    fontSize: font.size.xs,
    color: colors.text.disabled,
  },

  // Filter/tab button (inactive)
  filterButton: {
    padding: "5px 12px",
    borderRadius: radius.lg,
    fontSize: font.size.xs,
    border: "none",
    cursor: "pointer",
    fontWeight: font.weight.medium,
    transition: transition.normal,
  },

  // Standard card
  card: {
    background: colors.bg.card,
    borderRadius: radius["2xl"],
    padding: spacing[5],
    border: `1px solid ${colors.border.default}`,
  },

  // Compact card (smaller padding)
  cardCompact: {
    background: colors.bg.card,
    borderRadius: radius.xl,
    padding: `${spacing[3]}px ${spacing[4]}px`,
    border: `1px solid ${colors.border.default}`,
  },
};
