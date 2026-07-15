import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, editorsTable } from "@workspace/db";
import { requireEditor } from "../middlewares/requireEditor";
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

// Use the common JWKS endpoint so tokens issued for any tenant (including
// tenants other than the registering tenant) can have their signatures
// verified. Microsoft publishes the same signing keys at both the
// tenant-specific and common endpoints.
const jwks = jwksClient({
  jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
  cache: true,
  cacheMaxAge: 600_000,
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    jwks.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

async function verifyEntraToken(idToken: string): Promise<{ email: string; tid: string }> {
  const ENTRA_CLIENT_ID = process.env["ENTRA_CLIENT_ID"];
  if (!ENTRA_CLIENT_ID) {
    throw new Error("ENTRA_CLIENT_ID is not configured");
  }

  const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
    jwt.verify(
      idToken,
      (header, callback) => {
        getSigningKey(header)
          .then((key) => callback(null, key))
          .catch(callback);
      },
      {
        algorithms: ["RS256"],
        audience: ENTRA_CLIENT_ID,
      },
      (err, payload) => {
        if (err) return reject(err);
        resolve(payload as jwt.JwtPayload);
      },
    );
  });

  const email = (decoded["preferred_username"] ?? decoded["email"] ?? decoded["upn"]) as string | undefined;
  if (!email) {
    throw new Error("No email claim in token");
  }

  return { email: email.toLowerCase(), tid: decoded["tid"] as string };
}

// Simple in-memory rate limit for the diagnostic beacon: max 60 logged
// entries per rolling minute across all clients. Beyond that, requests are
// still acknowledged (204) but silently dropped so the endpoint cannot be
// used to flood production logs.
let debugLogWindowStart = 0;
let debugLogCount = 0;

router.post("/auth/debug-log", (req, res) => {
  const now = Date.now();
  if (now - debugLogWindowStart > 60_000) {
    debugLogWindowStart = now;
    debugLogCount = 0;
  }
  if (debugLogCount < 60) {
    debugLogCount += 1;
    const body = req.body as Record<string, unknown> | undefined;
    const safe = JSON.stringify(body ?? {}).slice(0, 2000);
    req.log.warn({ clientDebug: safe }, "SSO client debug beacon");
  }
  res.status(204).end();
});

router.post("/auth/microsoft", async (req, res) => {
  const { idToken } = req.body as { idToken?: string };

  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  let email: string;
  try {
    ({ email } = await verifyEntraToken(idToken));
  } catch (err) {
    req.log.warn({ err }, "Entra token verification failed");
    res.status(401).json({ error: "Invalid or expired Microsoft token" });
    return;
  }

  const [editor] = await db
    .select({ id: editorsTable.id, email: editorsTable.email, apiKey: editorsTable.apiKey, isActive: editorsTable.isActive })
    .from(editorsTable)
    .where(eq(editorsTable.email, email))
    .limit(1);

  if (!editor) {
    res.status(403).json({ error: "Access not yet approved", code: "EDITOR_NOT_APPROVED" });
    return;
  }

  if (!editor.isActive) {
    res.status(403).json({ error: "Access not yet approved", code: "EDITOR_NOT_APPROVED" });
    return;
  }

  res.json({ apiKey: editor.apiKey, email: editor.email, id: editor.id });
});

router.get("/auth/me", requireEditor, async (req, res) => {
  const key =
    req.header("x-api-key") ??
    req.header("authorization")?.replace(/^Bearer\s+/, "");

  if (!key) {
    res.status(401).json({ error: "Missing or invalid API key" });
    return;
  }

  const [editor] = await db
    .select({ id: editorsTable.id, email: editorsTable.email })
    .from(editorsTable)
    .where(eq(editorsTable.apiKey, key))
    .limit(1);

  if (!editor) {
    res.status(403).json({ error: "Access not yet approved", code: "EDITOR_NOT_APPROVED" });
    return;
  }

  res.json({ email: editor.email, id: editor.id });
});

export default router;
