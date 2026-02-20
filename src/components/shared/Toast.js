import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { colors, font, radius, glass, shadows } from '../../config/designTokens';

const ToastContext = createContext(null);

const ICONS = {
  success: { icon: CheckCircle, color: colors.status.success },
  error:   { icon: AlertCircle, color: colors.status.error },
  info:    { icon: Info, color: colors.brand.purple },
};

function ToastItem({ toast, onDismiss }) {
  const { icon: Icon, color } = ICONS[toast.type] || ICONS.info;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
        background: colors.bg.elevated, borderRadius: radius.xl,
        border: `1px solid ${colors.border.default}`,
        ...glass.heavy,
        boxShadow: shadows.lg,
        maxWidth: 360, minWidth: 200,
      }}
    >
      <Icon size={16} color={color} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: font.size.sm, color: colors.text.primary, flex: 1 }}>{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} style={{
        background: "none", border: "none", cursor: "pointer", padding: 2,
        display: "flex", alignItems: "center", flexShrink: 0,
      }}>
        <X size={12} color={colors.text.disabled} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container — bottom right */}
      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none",
      }}>
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const addToast = useContext(ToastContext);
  if (!addToast) throw new Error("useToast must be inside ToastProvider");
  return addToast;
}
