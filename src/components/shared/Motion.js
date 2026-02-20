/**
 * Framer Motion wrappers for consistent animations across the app.
 * Usage:
 *   <FadeIn>content</FadeIn>
 *   <StaggerList>items</StaggerList>
 *   <ScaleHover>button</ScaleHover>
 */
import { motion, AnimatePresence } from 'framer-motion';

// Fade in from below (default for cards/sections)
export function FadeIn({ children, delay = 0, duration = 0.4, y = 12, style, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger container — children animate in sequence
export function StaggerList({ children, stagger = 0.06, style, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger item — use inside StaggerList
export function StaggerItem({ children, style, className }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale on hover (for buttons, cards)
export function ScaleHover({ children, scale = 1.03, style, className, ...props }) {
  return (
    <motion.div
      whileHover={{ scale, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      style={style}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Tab content transition — direction-aware slide + fade
// direction: 1 = slide right (going forward), -1 = slide left (going back)
export function TabTransition({ children, tabKey, direction = 1 }) {
  const slideX = 30 * direction;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: slideX, y: 4 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: -slideX, y: 4 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Re-export motion for direct use
export { motion, AnimatePresence };
