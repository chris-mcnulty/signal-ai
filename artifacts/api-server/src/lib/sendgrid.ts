const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY?.trim();
const SENDGRID_LIST_ID = process.env.SENDGRID_LIST_ID?.trim();
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "report@bluetrail.ai";
const FROM_NAME = "bluetrAIl Intelligence Report";

export function isSendGridConfigured(): boolean {
  return !!SENDGRID_API_KEY && SENDGRID_API_KEY !== "skip";
}

export interface SyncResult {
  ok: boolean;
  contactId?: string;
  error?: string;
}

export async function syncContactToSendGrid(email: string): Promise<SyncResult> {
  if (!isSendGridConfigured()) {
    return { ok: false, error: "SendGrid not configured" };
  }

  const contact: Record<string, unknown> = { email };
  const body: Record<string, unknown> = { contacts: [contact] };
  if (SENDGRID_LIST_ID) body.list_ids = [SENDGRID_LIST_ID];

  try {
    const res = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `SendGrid ${res.status}: ${text}` };
    }

    const data = (await res.json().catch(() => ({}))) as { job_id?: string };
    return { ok: true, contactId: data.job_id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  if (!isSendGridConfigured()) return;

  const html = `
    <div style="font-family:'IBM Plex Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;color:#1a1a1a;">
      <div style="background:#0B2E59;padding:32px 40px;text-align:center;">
        <span style="font-family:'Georgia',serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.02em;">
          bluetr<span style="color:#B8C2CC;">AI</span>l
        </span>
        <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-top:4px;">Intelligence Report</div>
      </div>
      <div style="padding:40px;">
        <p style="font-size:18px;font-weight:600;margin:0 0 16px;">You're subscribed.</p>
        <p style="color:#444;line-height:1.7;margin:0 0 24px;">
          Thank you for subscribing to the bluetrAIl Intelligence Report. We track what's actually moving in AI — the business logic, not the noise.
        </p>
        <p style="color:#444;line-height:1.7;font-style:italic;margin:0 0 32px;">Ahead of the frontier.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;" />
        <p style="font-size:12px;color:#999;margin:0;">
          You're receiving this because you subscribed at bluetrail.ai.
          <a href="https://www.bluetrail.ai/unsubscribe?email=${encodeURIComponent(email)}" style="color:#0047AB;">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: "You're subscribed to the bluetrAIl Intelligence Report",
      content: [{ type: "text/html", value: html }],
    }),
  }).catch(() => {});
}
