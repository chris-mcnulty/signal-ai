import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const SESSION_KEY = "dashboard_api_key";
const EMAIL_KEY = "dashboard_editor_email";
const STATUS_KEY = "dashboard_editor_status";
const IS_ADMIN_KEY = "dashboard_is_admin";

export type EditorStatus = "approved" | "pending" | "unknown";

interface AuthContextValue {
  isLoggedIn: boolean;
  editorEmail: string | null;
  editorStatus: EditorStatus;
  isAdmin: boolean;
  login: (key: string, email: string, status: EditorStatus, isAdmin?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStatus(): EditorStatus {
  const v = sessionStorage.getItem(STATUS_KEY);
  if (v === "approved" || v === "pending") return v;
  return "unknown";
}

function readIsAdmin(): boolean {
  return sessionStorage.getItem(IS_ADMIN_KEY) === "true";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY));
  const [email, setEmail] = useState<string | null>(() => sessionStorage.getItem(EMAIL_KEY));
  const [editorStatus, setEditorStatus] = useState<EditorStatus>(readStatus);
  const [isAdmin, setIsAdmin] = useState<boolean>(readIsAdmin);

  // Keep a ref in sync with key on every render so the getter closure always
  // reads the latest value without needing to re-register a new getter function.
  // This avoids the null-window that occurred when the old useEffect([key])
  // ran its cleanup (setAuthTokenGetter(null)) before the setup re-ran.
  const keyRef = useRef<string | null>(key);
  keyRef.current = key;

  // Register the getter synchronously during the first render — NOT in an
  // effect. React runs child effects before parent effects, so a query hook
  // in a child page (e.g. useGetDraft on a direct load of /drafts/:id) fires
  // its fetch before this provider's useEffect would run. That sent the first
  // request without the Authorization header and it failed with a 401 that
  // react-query never retries — the draft editor stayed empty and
  // category-conditional panels (Case Study / Spotlight) never appeared.
  const registeredRef = useRef(false);
  if (!registeredRef.current) {
    registeredRef.current = true;
    setAuthTokenGetter(() => keyRef.current);
  }

  const login = useCallback((newKey: string, newEmail: string, status: EditorStatus, adminFlag?: boolean) => {
    sessionStorage.setItem(SESSION_KEY, newKey);
    sessionStorage.setItem(EMAIL_KEY, newEmail);
    sessionStorage.setItem(STATUS_KEY, status);
    sessionStorage.setItem(IS_ADMIN_KEY, String(adminFlag ?? false));
    setKey(newKey);
    setEmail(newEmail);
    setEditorStatus(status);
    setIsAdmin(adminFlag ?? false);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    sessionStorage.removeItem(STATUS_KEY);
    sessionStorage.removeItem(IS_ADMIN_KEY);
    setKey(null);
    setEmail(null);
    setEditorStatus("unknown");
    setIsAdmin(false);
  }, []);

  // The getter reads from keyRef.current so it always returns the latest key
  // with no teardown/setup gap on re-renders. The cleanup only fires on true
  // unmount (provider leaving the tree).
  useEffect(() => {
    // Re-register on (re)mount so StrictMode's mount→cleanup→remount cycle
    // (which re-runs effects but not render) doesn't leave the getter null.
    registeredRef.current = true;
    setAuthTokenGetter(() => keyRef.current);
    return () => {
      setAuthTokenGetter(null);
      registeredRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!key, editorEmail: email, editorStatus, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
