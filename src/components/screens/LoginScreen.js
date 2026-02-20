import { useAuth } from '../../contexts/AuthContext';
import { Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors, font, radius, gradients, shadows, alpha, glass } from '../../config/designTokens';

export default function LoginScreen() {
  const { loginWithGoogle, authError, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: colors.bg.page, display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <Loader size={32} color={colors.brand.purple} style={{ animation: "spin 1s linear infinite" }} />
        <div style={{ color: colors.text.muted, fontSize: font.size.md }}>Verifica autenticazione...</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: colors.bg.page, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background glow orbs */}
      <div style={{
        position: "absolute", top: "15%", left: "20%", width: 300, height: 300,
        background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)",
        borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "20%", right: "15%", width: 250, height: 250,
        background: "radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)",
        borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none",
      }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 36 }}
      >
        <div style={{
          fontSize: 40, fontWeight: font.weight.black, letterSpacing: "-0.03em",
          background: gradients.brand,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Ultranalytics
        </div>
        <div style={{ color: colors.text.disabled, fontSize: font.size.md, marginTop: 6 }}>
          Dashboard eventi & registrazioni
        </div>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          background: colors.bg.card, borderRadius: radius["4xl"], padding: "36px 40px",
          border: `1px solid ${colors.border.default}`, width: "100%", maxWidth: 380,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          ...glass.heavy,
          boxShadow: shadows.lg,
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: radius["2xl"],
          background: gradients.brand,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, boxShadow: shadows.brand,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary }}>
            Accesso richiesto
          </div>
          <div style={{ fontSize: font.size.base, color: colors.text.muted, marginTop: 4 }}>
            Accedi con il tuo account Google
          </div>
        </div>

        {authError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{
              background: alpha.error[10], border: `1px solid ${alpha.error[30]}`,
              borderRadius: radius.lg, padding: "10px 14px", width: "100%",
              fontSize: font.size.sm, color: colors.status.errorLight, textAlign: "center",
            }}
          >
            {authError}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02, boxShadow: shadows.brand }}
          whileTap={{ scale: 0.98 }}
          onClick={loginWithGoogle}
          style={{
            width: "100%", padding: "12px 20px", borderRadius: radius.xl,
            background: colors.text.inverse, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontSize: font.size.md, fontWeight: font.weight.semibold, color: "#1a1a1a",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Accedi con Google
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ color: colors.text.disabled, fontSize: font.size.xs, marginTop: 24, textAlign: "center" }}
      >
        Solo gli account autorizzati possono accedere
      </motion.div>
    </div>
  );
}
