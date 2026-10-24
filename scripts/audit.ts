/**
 * Auditoría post-build de dist/: enlaces internos rotos, canonical, hreflang recíproco,
 * anclas (#id) inexistentes y peso por página. Ejecuta: bun run check
 */
import config from "../site.config";

const DIST = "dist";
const htmlFiles: string[] = [];
for await (const f of new Bun.Glob("**/index.html").scan(DIST)) htmlFiles.push(f.replace(/\\/g, "/")); // Windows usa "\"

const exists = async (p: string) => Bun.file(`${DIST}${p.endsWith("/") ? p + "index.html" : p}`).exists();
const errors: string[] = [];
const pages = new Map<string, string>();
for (const f of htmlFiles) pages.set("/" + f.replace(/index\.html$/, ""), await Bun.file(`${DIST}/${f}`).text());

for (const [path, html] of pages) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== config.url + path) errors.push(`${path}: canonical ${canonical} ≠ ${config.url + path}`);

  // hreflang recíproco
  for (const [, , href] of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)) {
    const other = pages.get(href!.replace(config.url, ""));
    if (!other) errors.push(`${path}: hreflang apunta a página inexistente ${href}`);
    else if (!other.includes(`href="${config.url + path}"`)) errors.push(`${path}: hreflang no recíproco con ${href}`);
  }

  for (const [, href] of html.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:)/.test(href!)) continue;
    const [p, hash] = href!.split("#");
    if (p && !(await exists(p))) errors.push(`${path}: enlace roto ${href}`);
    const target = p ? pages.get(p) : html;
    if (hash && target && !target.includes(`id="${hash}"`)) errors.push(`${path}: ancla inexistente #${hash}`);
    if (hash && !p && !ids.has(hash)) errors.push(`${path}: ancla inexistente #${hash}`);
  }
  const kb = Buffer.byteLength(html) / 1024;
  if (kb > 100) errors.push(`${path}: HTML de ${kb.toFixed(0)} KB (revisa CSS en línea/SVGs)`);
}

if (errors.length) { console.error(`✗ ${errors.length} problemas:\n  ${[...new Set(errors)].join("\n  ")}`); process.exit(1); }
console.log(`✓ Auditoría OK: ${pages.size} páginas, enlaces/anclas/canonical/hreflang correctos`);
