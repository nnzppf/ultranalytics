import { useAuth } from '../../contexts/AuthContext';
import { Loader } from 'lucide-react';
import { colors, font, radius, gradients, shadows, alpha } from '../../config/designTokens';

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
    }}>
      {/* Logo / Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          fontSize: 36, fontWeight: font.weight.black, letterSpacing: "-0.02em",
          background: gradients.brand,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Ultranalytics
        </div>
        <div style={{ color: colors.text.disabled, fontSize: font.size.md, marginTop: 8 }}>
          Dashboard eventi & registrazioni
        </div>
      </div>

      {/* Login Card */}
      <div style={{
        background: colors.bg.card, borderRadius: radius["4xl"], padding: "36px 40px",
        border: `1px solid ${colors.border.default}`, width: "100%", maxWidth: 380,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: radius["4xl"],
          background: gradients.brand,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
        }}>
          🔒
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary }}>
            Accesso richiesto
          </div>
          <div style={{ fontSize: font.size.base, color: colors.text.disabled, marginTop: 4 }}>
            Accedi con il tuo account Google per continuare
          </div>
        </div>

        {authError && (
          <div style={{
            background: alpha.error[10], border: `1px solid ${alpha.error[30]}`,
            borderRadius: radius.lg, padding: "10px 14px", width: "100%",
            fontSize: font.size.sm, color: colors.status.errorLight, textAlign: "center",
          }}>
            {authError}
          </div>
        )}

        <button
          onClick={loginWithGoogle}
          style={{
            width: "100%", padding: "12px 20px", borderRadius: radius.xl,
            background: colors.text.inverse, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.bg.card,
            transition: `transform 0.15s, box-shadow 0.15s`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = shadows.brand;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Google Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Accedi con Google
        </button>
      </div>

      <div style={{ color: colors.border.strong, fontSize: font.size.xs, marginTop: 24, textAlign: "center" }}>
        Solo gli account autorizzati possono accedere
      </div>
    </div>
  );
}
