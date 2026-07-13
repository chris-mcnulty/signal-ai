import { PublicClientApplication, type Configuration, type PopupRequest } from "@azure/msal-browser";

const clientId = import.meta.env["VITE_ENTRA_CLIENT_ID"] as string | undefined;

if (!clientId) {
  console.warn("[MSAL] VITE_ENTRA_CLIENT_ID is not set — Microsoft sign-in will not work");
}

// Use the "common" endpoint so users from any Microsoft tenant (including
// tenants that are not the registering tenant) can authenticate. The app
// must be registered as multi-tenant in Azure Entra. The tenant ID is only
// used on the backend for JWT validation, not in the MSAL authority.
const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? "",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest: PopupRequest = {
  scopes: ["openid", "profile", "email"],
};
