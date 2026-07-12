import { PublicClientApplication, type Configuration, type PopupRequest } from "@azure/msal-browser";

const clientId = import.meta.env["VITE_ENTRA_CLIENT_ID"] as string | undefined;
const tenantId = (import.meta.env["VITE_ENTRA_TENANT_ID"] as string | undefined) ?? "common";

if (!clientId) {
  console.warn("[MSAL] VITE_ENTRA_CLIENT_ID is not set — Microsoft sign-in will not work");
}

const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? "",
    authority: `https://login.microsoftonline.com/${tenantId}`,
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
