import { createSign } from "node:crypto";
import { logger } from "./logger";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_INDEXING_ENDPOINT =
  process.env.GOOGLE_INDEXING_ENDPOINT ??
  "https://indexing.googleapis.com/v3/urlNotifications:publish";
const GOOGLE_INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";

type ServiceAccountKey = {
  clientEmail: string;
  privateKey: string;
};

let invalidKeyLogged = false;

export function getGoogleServiceAccount(): ServiceAccountKey | null {
  // GOOGLE_INDEXING_SA_JSON is the documented name; the legacy
  // GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY is kept as a fallback.
  const raw =
    process.env.GOOGLE_INDEXING_SA_JSON ??
    process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY;
  if (!raw || raw.trim() === "" || !raw.trim().startsWith("{")) {
    // Missing or a placeholder value (e.g. "Skip") — treat as not configured.
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    if (!invalidKeyLogged) {
      logger.error(
        "Google Indexing: GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY is not valid JSON; expected the full service-account key file contents",
      );
      invalidKeyLogged = true;
    }
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const clientEmail = record["client_email"];
  const privateKey = record["private_key"];
  if (typeof clientEmail !== "string" || typeof privateKey !== "string") {
    if (!invalidKeyLogged) {
      logger.error(
        "Google Indexing: service-account key JSON is missing client_email or private_key",
      );
      invalidKeyLogged = true;
    }
    return null;
  }
  invalidKeyLogged = false;
  return {
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildSignedJwt(account: ServiceAccountKey): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  );
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: account.clientEmail,
      scope: GOOGLE_INDEXING_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(account.privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

let cachedToken: { token: string; expiresAtMs: number } | null = null;

async function getAccessToken(account: ServiceAccountKey): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const jwt = buildSignedJwt(account);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Google Indexing: token request failed (HTTP ${response.status}): ${body.slice(0, 300)}`,
    );
  }
  const data = JSON.parse(body) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("Google Indexing: token response missing access_token");
  }
  cachedToken = {
    token: data.access_token,
    expiresAtMs: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

/**
 * Build the Google Indexing API notification body. Exported so unit tests can
 * pin the payload (notably URL_DELETED for the unpublish path) without live
 * credentials.
 */
export function googleNotifyPayload(
  url: string,
  mode: "publish" | "delete" = "publish",
): { url: string; type: "URL_UPDATED" | "URL_DELETED" } {
  return { url, type: mode === "delete" ? "URL_DELETED" : "URL_UPDATED" };
}

export async function submitUrlToGoogle(
  account: ServiceAccountKey,
  url: string,
  mode: "publish" | "delete" = "publish",
): Promise<{ ok: boolean; status: number; body: string }> {
  const token = await getAccessToken(account);
  const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(googleNotifyPayload(url, mode)),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

/**
 * Mint a Google OAuth access token for an arbitrary scope (used by the
 * Search Console URL Inspection client, which needs webmasters.readonly
 * rather than the indexing scope). Tokens are not cached here — coverage
 * scans run at most daily.
 */
export async function getGoogleAccessTokenForScope(
  account: ServiceAccountKey,
  scope: string,
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: account.clientEmail,
      scope,
      aud: GOOGLE_TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(account.privateKey);
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Google token request failed (HTTP ${response.status}): ${body.slice(0, 300)}`,
    );
  }
  const data = JSON.parse(body) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Google token response missing access_token");
  }
  return data.access_token;
}
