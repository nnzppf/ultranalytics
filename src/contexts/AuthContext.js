import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

// Whitelist of allowed emails (add your email here)
const ALLOWED_EMAILS = [
  // Leave empty to allow any Google account
  // Or add specific emails: 'you@gmail.com', 'partner@gmail.com'
];

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Check whitelist if configured
        if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(firebaseUser.email)) {
          setAuthError(`L'email ${firebaseUser.email} non è autorizzata.`);
          signOut(auth);
          setUser(null);
        } else {
          setUser(firebaseUser);
          setAuthError(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Check whitelist
      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(result.user.email)) {
        setAuthError(`L'email ${result.user.email} non è autorizzata ad accedere.`);
        await signOut(auth);
        return null;
      }
      return result.user;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed popup, not an error
        return null;
      }
      console.error('Login error:', error);
      setAuthError('Errore durante il login. Riprova.');
      return null;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    loading,
    authError,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
