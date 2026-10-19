import { NextResponse } from "next/server";

// Receives "suggest a new chart" messages from Report Studio and emails them.
// The recipient lives only in a server environment variable (SUGGESTIONS_TO), so it
// never reaches the browser bundle. Required env vars on Netlify:
//   RESEND_API_KEY   - API key from resend.com (server only; never prefix with NEXT_PUBLIC_)
//   SUGGESTIONS_TO   - destination address
//   SUGGESTIONS_FROM - optional sender, e.g. "WFM Rescue <hello@yourdomain.com>"
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUGGESTIONS_TO;
  const from = process.env.SUGGESTIONS_FROM || "WFM Rescue <onboarding@resend.dev>";
  if (!apiKey || !to) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  let body: { message?: unknown; report?: unknown; email?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10 || message.length > 1500) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const report = typeof body.report === "string" ? body.report.slice(0, 120) : "";
  const replyTo = typeof body.email === "string" && EMAIL_RE.test(body.email.trim()) ? body.email.trim() : "";
  const locale = body.locale === "en" ? "en" : "es";

  const subject = `[Report Studio] ${locale === "es" ? "Sugerencia de gráfico" : "Chart suggestion"}${report ? ` · ${report}` : ""}`;
  const text = [
    `Report: ${report || "-"}`,
    `Locale: ${locale}`,
    `Reply-to: ${replyTo || "-"}`,
    "",
    message,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) return NextResponse.json({ error: "send_failed" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
