import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { msalInstance } from "./lib/msal";

const SESSION_KEY = "dashboard_api_key";
const EMAIL_KEY = "dashboard_editor_email";
const STATUS_KEY = "dashboard_editor_status";

msalInstance.initialize().then(async () => {
  try {
    // Handle the result of a loginRedirect flow. This runs before React mounts
    // so sessionStorage is pre-populated and AuthProvider reads the correct
    // state on first render. navigateToLoginRequestUrl is false in msal.ts so
    // we control navigation here rather than letting MSAL race our fetch or
    // land on the wrong URL.
    const response = await msalInstance.handleRedirectPromise();
    if (response?.idToken) {
      const res = await fetch("/api/auth/microsoft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.idToken }),
      });
      if (res.ok) {
        const data = await res.json() as { apiKey: string; email: string };
        sessionStorage.setItem(SESSION_KEY, data.apiKey);
        sessionStorage.setItem(EMAIL_KEY, data.email);
        sessionStorage.setItem(STATUS_KEY, "approved");
        // Navigate to the dashboard — the auth state is now in sessionStorage
        // so the app will mount logged-in without another redirect.
        window.location.replace(window.location.origin + "/dashboard/");
        return; // don't mount React here; the replace triggers a fresh load
      }
      // Backend rejected the token — fall through and show the login page
    }
  } catch {
    // Redirect processing failed — show the login page
  }

  createRoot(document.getElementById("root")!).render(<App />);
});
