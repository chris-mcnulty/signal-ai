import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { msalInstance } from "./lib/msal";

msalInstance.initialize().then(async () => {
  // On every page except the redirect callback, drain any stale MSAL
  // interaction lock left by a previous interrupted loginRedirect.
  // Without this, an interrupted flow leaves "interaction_in_progress" in
  // sessionStorage and the next loginRedirect call throws before it can
  // navigate to Microsoft. AuthCallback.tsx owns handleRedirectPromise()
  // on the /app/callback route so we skip it there.
  if (!window.location.pathname.endsWith("/app/callback")) {
    await msalInstance
      .handleRedirectPromise()
      .then((response) => {
        if (response) {
          // An auth response landed on a NON-callback page — this means the
          // redirect URI doesn't match the callback route and the drain just
          // swallowed a real sign-in. Report it so we can see it in prod logs.
          void fetch("/api/auth/debug-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stage: "drain-swallowed-response",
              path: window.location.pathname,
              gotIdToken: !!response.idToken,
              ua: navigator.userAgent.slice(0, 120),
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }
  createRoot(document.getElementById("root")!).render(<App />);
});
