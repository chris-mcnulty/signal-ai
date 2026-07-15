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
    await msalInstance.handleRedirectPromise().catch(() => {});
  }
  createRoot(document.getElementById("root")!).render(<App />);
});
