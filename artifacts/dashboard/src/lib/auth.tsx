import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
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

  // Keep a ref in sync with key on every render so the getter closure always
  // reads the latest value without needing to re-register a new getter function.
  // This avoids the null-window that occurred when the old useEffect([key])
  // ran its cleanup (setAuthTokenGetter(null)) before the setup re-ran.
  const keyRef = useRef<string | null>(key);
  keyRef.current = key;

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

  // Register the getter once on mount. The getter reads from keyRef.current so
  // it always returns the latest key with no teardown/setup gap on re-renders.
  // The cleanup only fires on true unmount (provider leaving the tree).
  useEffect(() => {
    setAuthTokenGetter(() => keyRef.current);
    return () => setAuthTokenGetter(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
