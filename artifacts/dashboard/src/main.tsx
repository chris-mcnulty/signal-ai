import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { msalInstance } from "./lib/msal";

const SESSION_KEY = "dashboard_api_key";
const EMAIL_KEY = "dashboard_editor_email";
const STATUS_KEY = "dashboard_editor_status";

msalInstance.initialize().then(async () => {
  try {
    // Handle the result of a loginRedirect flow (e.g. mobile Safari where
    // popups are blocked and MSAL falls back to a full-page redirect).
    // This runs before React mounts so sessionStorage is pre-populated and
    // the AuthProvider reads the correct state on first render.
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
      }
    }
  } catch {
    // Redirect processing failed — render the app anyway (login page will show)
  }

  createRoot(document.getElementById("root")!).render(<App />);
});
