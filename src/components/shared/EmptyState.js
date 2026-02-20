import { motion } from 'framer-motion';
import { colors, font, radius, alpha } from '../../config/designTokens';

export default function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "48px 24px", textAlign: "center",
      }}
    >
      {Icon && (
        <div style={{
          width: 56, height: 56, borderRadius: radius["2xl"],
          background: alpha.brand[8], display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <Icon size={24} color={colors.brand.purple} />
        </div>
      )}
      <div style={{ fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text.primary, marginBottom: 6 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: font.size.sm, color: colors.text.muted, maxWidth: 320, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {action && onAction && (
        <button onClick={onAction} style={{
          marginTop: 16, padding: "8px 20px", borderRadius: radius.lg,
          background: colors.interactive.active, color: colors.interactive.activeText,
          border: "none", cursor: "pointer", fontSize: font.size.sm, fontWeight: font.weight.semibold,
        }}>
          {action}
        </button>
      )}
    </motion.div>
  );
}
