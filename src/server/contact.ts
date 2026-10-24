import config from "../../site.config";
import { escape } from "../lib/html";

/**
 * POST /api/contact — valida, filtra spam y envía el correo con Resend o SMTP.
 * Variables: RESEND_API_KEY | SMTP_*, CONTACT_TO, CONTACT_FROM (ver .env.example)
 */
const hits = new Map<string, number[]>();
const LIMIT = 5, WINDOW = 10 * 60_000;     // 5 envíos / 10 min por IP
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const oneLine = (s = "") => s.replace(/[\r\n]+/g, " ").trim();   // evita inyección de cabeceras

function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(ip, list);
  return list.length > LIMIT;
}

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // envíos sin JS desde algunos navegadores
  const host = new URL(origin).hostname;
  return host === new URL(config.url).hostname || host === "localhost" || host === "127.0.0.1";
}

export async function handleContact(req: Request, ip: string): Promise<Response> {
  const isJson = req.headers.get("content-type")?.includes("application/json");
  const reply = (status: number, body: object) =>
    isJson ? Response.json(body, { status })
           : Response.redirect(`${req.headers.get("referer") ?? "/"}#contacto`, 303); // fallback sin JS

  if (!allowedOrigin(req)) return reply(403, { ok: false, error: "origin" });
  if (rateLimited(ip)) return reply(429, { ok: false, error: "rate_limit" });

  let d: Record<string, string>;
  try {
    d = isJson ? await req.json() : (Object.fromEntries(await req.formData()) as Record<string, string>);
  } catch { return reply(400, { ok: false, error: "bad_request" }); }

  // Spam: honeypot lleno o formulario enviado en < 3 s → fingimos éxito para no dar pistas al bot
  const elapsed = Date.now() - Number(d._ts || 0);
  if (d.website || (d._ts && elapsed < 3000)) return reply(200, { ok: true });

  const name = oneLine(d.name).slice(0, 200);
  const email = oneLine(d.email).slice(0, 200);
  const message = (d.message ?? "").trim().slice(0, 5000);
  if (!name || !EMAIL.test(email) || message.length < 10) return reply(422, { ok: false, error: "invalid" });

  const extra = ["phone", "company", "subject", "lang", "page"]
    .filter((k) => d[k]).map((k) => [k, oneLine(d[k]).slice(0, 300)] as const);
  const subject = `[${config.name}] ${oneLine(d.subject) || `Nuevo mensaje de ${name}`}`.slice(0, 180);
  const text = [`Nombre: ${name}`, `Email: ${email}`, ...extra.map(([k, v]) => `${k}: ${v}`), "", message].join("\n");
  const htmlBody = `<h2>${escape(subject)}</h2><p><b>Nombre:</b> ${escape(name)}<br><b>Email:</b> ${escape(email)}<br>${
    extra.map(([k, v]) => `<b>${k}:</b> ${escape(v)}`).join("<br>")}</p><p style="white-space:pre-wrap">${escape(message)}</p>`;

  const to = process.env.CONTACT_TO ?? config.seo.organization.email;
  const from = process.env.CONTACT_FROM ?? `${config.name} <no-reply@${new URL(config.url).hostname.replace(/^www\./, "")}>`;

  // Desarrollo sin credenciales: muestra el correo en consola en vez de enviarlo
  const hasCreds = config.contact.provider === "resend" ? !!process.env.RESEND_API_KEY : !!process.env.SMTP_HOST;
  if (!hasCreds && process.env.NODE_ENV !== "production") {
    console.log(`\n✉  [dry-run] Para: ${to}\n   Asunto: ${subject}\n${text.replace(/^/gm, "   ")}\n`);
    return reply(200, { ok: true, dryRun: true });
  }

  try {
    if (config.contact.provider === "resend") {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], reply_to: email, subject, text, html: htmlBody }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    } else if (config.contact.provider === "smtp") {
      // @ts-ignore — dependencia opcional: bun add nodemailer
      const nodemailer = (await import("nodemailer")).default;
      const tx = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await tx.sendMail({ from, to, replyTo: email, subject, text, html: htmlBody });
    } else {
      return reply(501, { ok: false, error: "provider_is_client_side" });
    }
    return reply(200, { ok: true });
  } catch (err) {
    console.error("[contact]", err);
    return reply(502, { ok: false, error: "send_failed" });
  }
}
