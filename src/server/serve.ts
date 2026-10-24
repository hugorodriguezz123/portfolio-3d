import config from "../../site.config";
import { handleContact } from "./contact";
import { join, extname, posix } from "node:path";

/**
 * Servidor de producción con Bun.serve:
 *  - Sirve dist/ con caché correcta (assets con hash = inmutables, HTML = revalidar) y gzip.
 *  - Redirecciones cortas a redes sociales (/ig, /wa …) definidas en site.config.ts.
 *  - Normaliza URLs a barra final (/privacidad → /privacidad/) para una sola URL canónica.
 *  - POST /api/contact para el formulario (provider resend|smtp).
 * Si despliegas en hosting estático puro (Netlify, Cloudflare Pages, Vercel) NO necesitas este archivo:
 * el build genera _redirects y _headers equivalentes.
 */
const DIST = join(import.meta.dir, "../../dist");
const redirects = new Map(config.social.filter((s) => s.redirect).map((s) => [s.redirect!, s.url]));
const gzCache = new Map<string, Uint8Array<ArrayBuffer>>();
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".svg", ".xml", ".txt", ".json", ".webmanifest"]);

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

function cacheControl(path: string) {
  if (path.startsWith("/assets/") || path.startsWith("/images/_opt/")) return "public, max-age=31536000, immutable";
  if (/\.(png|jpe?g|webp|avif|svg|ico|woff2|mp4|webm)$/.test(path)) return "public, max-age=2592000";
  return "public, max-age=0, must-revalidate";
}

export function createHandler(opts: { dev?: boolean; inject?: string } = {}) {
  return async function fetch(req: Request, server: { requestIP(r: Request): { address: string } | null }) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);

    if (path === "/api/contact") {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? server.requestIP(req)?.address ?? "?";
      return handleContact(req, ip);
    }

    const r = redirects.get(path.replace(/\/$/, ""));
    if (r) return Response.redirect(r, 302); // 302: puedes cambiar el destino sin caché eterna del navegador

    // Barra final para rutas sin extensión
    if (!extname(path) && !path.endsWith("/")) return Response.redirect(url.pathname + "/" + url.search, 301);

    // posix: en Windows normalize() cambia "/" por "\" y la comprobación de barra final falla
    const safe = posix.normalize(path.replace(/\\/g, "/")).replace(/^(\.\.\/)+/, "");
    let filePath = join(DIST, safe.endsWith("/") ? safe + "index.html" : safe);
    let file = Bun.file(filePath);
    let status = 200;
    if (!(await file.exists())) {
      const locale = config.locales.find((l) => path.startsWith(`/${l}/`));
      filePath = join(DIST, locale ? `${locale}/404.html` : "404.html");
      file = Bun.file(filePath);
      status = 404;
    }

    const headers: Record<string, string> = {
      ...securityHeaders,
      "Content-Type": file.type,
      "Cache-Control": opts.dev ? "no-store" : status === 404 ? "no-cache" : cacheControl(path),
    };
    if (!opts.dev) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

    const ext = extname(filePath);
    if (opts.inject && ext === ".html") {
      const body = (await file.text()).replace("</body>", `${opts.inject}</body>`);
      return new Response(body, { status, headers });
    }
    if (!opts.dev && COMPRESSIBLE.has(ext) && req.headers.get("accept-encoding")?.includes("gzip")) {
      let gz = gzCache.get(filePath);
      if (!gz) { gz = Bun.gzipSync(new Uint8Array(await file.arrayBuffer())) as Uint8Array<ArrayBuffer>; gzCache.set(filePath, gz); }
      return new Response(gz, { status, headers: { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" } });
    }
    // Videos por rangos (206): Safari no reproduce un <video> si el servidor no los atiende
    const rango = status === 200 && /\.(mp4|webm)$/.test(ext) ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "") : null;
    if (rango) {
      const total = file.size;
      const inicio = rango[1] ? Number(rango[1]) : Math.max(0, total - Number(rango[2]));
      const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
      if (inicio >= total || inicio > fin) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${total}` } });
      return new Response(file.slice(inicio, fin + 1), { status: 206, headers: { ...headers, "Accept-Ranges": "bytes", "Content-Range": `bytes ${inicio}-${fin}/${total}`, "Content-Length": String(fin - inicio + 1) } });
    }
    return new Response(file, { status, headers: { ...headers, "Accept-Ranges": "bytes" } });
  };
}

if (import.meta.main) {
  const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: createHandler() });
  console.log(`▶ Sirviendo dist/ en ${server.url}`);
}
