import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const SESSION_KEY = "dashboard_api_key";
const EMAIL_KEY = "dashboard_editor_email";
const STATUS_KEY = "dashboard_editor_status";

export type EditorStatus = "approved" | "pending" | "unknown";

interface AuthContextValue {
  isLoggedIn: boolean;
  editorEmail: string | null;
  editorStatus: EditorStatus;
  login: (key: string, email: string, status: EditorStatus) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStatus(): EditorStatus {
  const v = sessionStorage.getItem(STATUS_KEY);
  if (v === "approved" || v === "pending") return v;
  return "unknown";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY));
  const [email, setEmail] = useState<string | null>(() => sessionStorage.getItem(EMAIL_KEY));
  const [editorStatus, setEditorStatus] = useState<EditorStatus>(readStatus);

  const login = useCallback((newKey: string, newEmail: string, status: EditorStatus) => {
    sessionStorage.setItem(SESSION_KEY, newKey);
    sessionStorage.setItem(EMAIL_KEY, newEmail);
    sessionStorage.setItem(STATUS_KEY, status);
    setKey(newKey);
    setEmail(newEmail);
    setEditorStatus(status);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    sessionStorage.removeItem(STATUS_KEY);
    setKey(null);
    setEmail(null);
    setEditorStatus("unknown");
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => key);
    return () => setAuthTokenGetter(null);
  }, [key]);

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!key, editorEmail: email, editorStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
