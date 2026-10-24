/**
 * Build estático: genera dist/ con un HTML pre-renderizado por página e idioma.
 *   bun run build.ts         → producción
 *   bun run build.ts --dev   → con sourcemaps (lo usa el servidor de desarrollo)
 */
import { rm, mkdir, cp, readdir } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import config from "./site.config";
import { translator, localePath, missing, defaultLocale } from "./src/lib/i18n";
import { layout, type Page, type RenderCtx } from "./src/lib/layout";
import { html, minifyHtml } from "./src/lib/html";
import { prepareImages } from "./src/lib/images";
import { sitemap, robots, type PageMeta } from "./src/lib/seo";
import { securityHeaders } from "./src/server/serve";

const DEV = process.argv.includes("--dev");
const OUT = "dist";
const t0 = performance.now();

// Se vacía dist/ en lugar de borrarla: en Windows un servidor que la está sirviendo bloquea la carpeta (EBUSY).
// Cada entrada se reintenta unas veces por si algún archivo está ocupado un instante.
for (const entrada of await readdir(OUT).catch(() => [] as string[])) {
  for (let intento = 0; ; intento++) {
    try { await rm(join(OUT, entrada), { recursive: true, force: true }); break; }
    catch (e) { if (intento >= 8) throw e; await Bun.sleep(150); }
  }
}
await mkdir(OUT, { recursive: true });
await cp("public", OUT, { recursive: true }).catch(() => {});
await prepareImages(OUT);

// ---------- JS del cliente (hash en el nombre → caché inmutable) ----------
const js = await Bun.build({
  entrypoints: ["src/client/main.ts"],
  outdir: join(OUT, "assets"),
  naming: "[name]-[hash].[ext]",
  target: "browser",
  splitting: true,          // three.js y el motor 3D van en un archivo aparte que se carga después
  minify: true,
  sourcemap: DEV ? "linked" : "none",
});
if (!js.success) { console.error(js.logs); process.exit(1); }
const jsPath = "/" + relative(OUT, js.outputs.find((o) => o.kind === "entry-point")!.path).replace(/\\/g, "/"); // Windows usa "\"

// ---------- CSS ----------
const cssBuild = await Bun.build({ entrypoints: ["src/styles/main.css"], minify: true });
if (!cssBuild.success) { console.error(cssBuild.logs); process.exit(1); }
const cssText = (await Bun.file("src/styles/fuentes.css").text()).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "") + await cssBuild.outputs[0]!.text();
let css: { inline?: string; href?: string };
if (config.build.inlineCss) css = { inline: cssText };
else {
  const hash = Bun.hash(cssText).toString(36);
  await Bun.write(join(OUT, `assets/main-${hash}.css`), cssText);
  css = { href: `/assets/main-${hash}.css` };
}

// ---------- Páginas × idiomas ----------
const pages: Page[] = [];
for await (const f of new Bun.Glob("*.ts").scan("src/pages")) {
  pages.push((await import(`./src/pages/${f}`)).default);
}
pages.sort((a, b) => a.slug.localeCompare(b.slug));

const warnings: string[] = [];
const allMeta: PageMeta[] = [];
const seenTitles = new Map<string, string>();

async function emit(path: string, content: string) {
  const file = join(OUT, path);
  await mkdir(dirname(file), { recursive: true });
  await Bun.write(file, content);
}

function audit(out: string, meta: PageMeta, where: string) {
  const h1 = (out.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) warnings.push(`${where}: ${h1} <h1> (debe haber exactamente 1)`);
  for (const tag of out.match(/<img\b[^>]*>/g) ?? []) if (!/\salt=/.test(tag)) warnings.push(`${where}: <img> sin alt → ${tag.slice(0, 80)}`);
  if (meta.title.length > 60) warnings.push(`${where}: title de ${meta.title.length} caracteres (ideal ≤ 60)`);
  if (meta.description.length < 70 || meta.description.length > 160)
    warnings.push(`${where}: description de ${meta.description.length} caracteres (ideal 70–160)`);
  const prev = seenTitles.get(meta.title);
  if (prev) warnings.push(`${where}: title duplicado con ${prev}`);
  seenTitles.set(meta.title, where);
}

for (const page of pages) {
  for (const locale of config.locales) {
    const t = translator(locale);
    const meta: PageMeta = { slug: page.slug, ...page.meta(t) };
    const ctx: RenderCtx = { locale, t, meta, videosUsed: new Set() };
    const body = page.render(ctx);                     // las secciones pueden añadir JSON-LD a ctx.meta
    const out = minifyHtml(layout({ ctx, body, css, js: jsPath, lcpImage: page.lcpImage, inmersiva: page.inmersiva }).value);
    const path = localePath(locale, page.slug);
    audit(out, meta, path);
    await emit(path + "index.html", out);
    if (locale === defaultLocale) allMeta.push(meta);
  }
}

// ---------- 404 por idioma ----------
for (const locale of config.locales) {
  const t = translator(locale);
  const meta: PageMeta = { slug: "404", title: t("notFound.title"), description: t("notFound.text"), noindex: true };
  const ctx: RenderCtx = { locale, t, meta, videosUsed: new Set() };
  const body = html`<section class="section not-found"><div class="container narrow">
    <h1>${t("notFound.title")}</h1><p class="lead">${t("notFound.text")}</p>
    <a class="btn btn-primary" href="${localePath(locale)}">${t("notFound.back")}</a></div></section>`;
  const prefix = locale === defaultLocale ? "/" : `/${locale}/`;
  await emit(`${prefix}404.html`, minifyHtml(layout({ ctx, body, css, js: jsPath }).value));
}

// ---------- SEO + hosting ----------
await emit("sitemap.xml", sitemap(allMeta));
await emit("robots.txt", robots());
await emit("manifest.webmanifest", JSON.stringify({
  name: config.name, short_name: config.name, start_url: "/", display: "standalone",
  background_color: config.themeColor.light, theme_color: config.themeColor.light,
  icons: [{ src: "/images/icon-512.png", sizes: "512x512", type: "image/png" }],
}));

// Netlify / Cloudflare Pages: redirecciones sociales + barra final + 404 por idioma
await emit("_redirects", [
  ...config.social.filter((s) => s.redirect).map((s) => `${s.redirect}  ${s.url}  302`),
  ...config.locales.slice(1).map((l) => `/${l}/*  /${l}/404.html  404`),
].join("\n") + "\n");

await emit("_headers", `/*
${Object.entries(securityHeaders).map(([k, v]) => `  ${k}: ${v}`).join("\n")}
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/images/_opt/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/draco/*
  Cache-Control: public, max-age=2592000
/modelos/*
  Cache-Control: public, max-age=2592000
`);

// Vercel: equivalente en vercel.json
await emit("vercel.json", JSON.stringify({
  trailingSlash: true,
  redirects: config.social.filter((s) => s.redirect).map((s) => ({ source: s.redirect, destination: s.url, permanent: false })),
  headers: [
    { source: "/(.*)", headers: Object.entries(securityHeaders).map(([key, value]) => ({ key, value })) },
    { source: "/assets/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  ],
}, null, 2));

// ---------- Informe ----------
const size = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const home = await Bun.file(join(OUT, "index.html")).arrayBuffer();
console.log(`✓ ${pages.length} páginas × ${config.locales.length} idiomas en ${Math.round(performance.now() - t0)} ms`);
const jsEntrada = js.outputs.find((o) => o.kind === "entry-point")!.size;
const js3d = js.outputs.filter((o) => o.kind === "chunk").reduce((a, o) => a + o.size, 0);
console.log(`  HTML home: ${size(home.byteLength)} (gzip ${size(Bun.gzipSync(new Uint8Array(home)).byteLength)}) · JS inicial: ${size(jsEntrada)} · JS 3D (diferido): ${size(js3d)} · CSS: ${size(cssText.length)}`);
if (missing.size) console.warn(`⚠  Traducciones faltantes:\n   ${[...missing].join("\n   ")}`);
if (warnings.length) console.warn(`⚠  SEO:\n   ${warnings.join("\n   ")}`);
