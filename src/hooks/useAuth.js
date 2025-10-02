import { useEffect, useState, useContext, createContext } from 'react';

// Simple context-based auth (adapt to your real auth)
const AuthCtx = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // replace with your real user object
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Example: read from localStorage or fetch session
    const token = localStorage.getItem('auth_token');
    setUser(token ? { id: 'me' } : null);
    setLoading(false);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, setUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
