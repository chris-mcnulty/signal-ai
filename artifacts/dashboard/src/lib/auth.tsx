import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const SESSION_KEY = "dashboard_api_key";

interface AuthContextValue {
  isLoggedIn: boolean;
  login: (key: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY));

  const login = useCallback((newKey: string) => {
    sessionStorage.setItem(SESSION_KEY, newKey);
    setKey(newKey);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setKey(null);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => key);
    return () => setAuthTokenGetter(null);
  }, [key]);

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!key, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
