import config from "../../site.config";
import { html, raw, type Safe } from "./html";
import { localePath, type T } from "./i18n";
import { marcaBarra } from "./marca";
import { selectorIdioma } from "./idiomas";
import { seoHead, baseSchemas, type PageMeta } from "./seo";
import { icon, networkName } from "./icons";
import { preloadImage } from "./images";

export interface RenderCtx {
  locale: string;
  t: T;
  meta: PageMeta;
  videosUsed: Set<string>;
}

export interface Page {
  slug: string;
  meta: (t: T) => Omit<PageMeta, "slug">;
  render: (ctx: RenderCtx) => Safe;
  /** Imagen LCP para <link rel=preload>. sizes DEBE coincidir con el del <img> o se descarga dos veces. */
  lcpImage?: { src: string; sizes?: string };
  /** true en la home: la oficina 3D ocupa la pantalla completa (la cabecera vive dentro de la app). */
  inmersiva?: boolean;
}
export const definePage = (p: Page) => p;

interface LayoutArgs {
  ctx: RenderCtx;
  body: Safe;
  css: { inline?: string; href?: string };
  js: string;
  lcpImage?: { src: string; sizes?: string };
  inmersiva?: boolean;
}

/**
 * Script bloqueante MÍNIMO en <head>: fija el tema y marca la página con .js y .modo-3d antes del primer
 * pintado (así el modo 3D no "parpadea" desde el modo documento). main.ts quita .modo-3d si no hay WebGL.
 */
const themeBoot = (def: string, sw: boolean, inmersiva = false) =>
  raw(`<script>(function(){var d=document.documentElement,t="${def}";try{${sw ? 't=localStorage.getItem("theme")||t;' : ""}}catch(e){}if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;d.classList.add("js"${inmersiva ? ',"modo-3d"' : ""})})()</script>`);

/**
 * Idioma automático (va primero en el <head>, antes de pintar): usa el primer idioma del navegador que sea español
 * o inglés; si no hay ninguno, inglés. Si la persona eligió un idioma con el selector (localStorage "idioma"), manda
 * esa elección. No redirige a buscadores, para que indexen cada versión por separado. Conserva ?query y #sección.
 */
const idiomaBoot = () =>
  raw(`<script>(function(){try{if(/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent))return;var p=location.pathname,en=p==="/en"||p.indexOf("/en/")===0,q=null;try{q=localStorage.getItem("idioma")}catch(e){}if(q!=="es"&&q!=="en"){q="en";var ls=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""];for(var i=0;i<ls.length;i++){var l=String(ls[i]).toLowerCase();if(l.indexOf("es")===0){q="es";break}if(l.indexOf("en")===0)break}}var resto=location.search+location.hash;if(q==="en"&&!en)location.replace("/en"+(p==="/"?"/":p)+resto);else if(q==="es"&&en)location.replace((p==="/en"?"/":p.slice(3))+resto)}catch(e){}})()</script>`);

/** Fuentes autoalojadas que conviene precargar (texto visible en la portada). */
const FUENTES_PRECARGA = ["/fonts/manrope-latin-400-normal.woff2", "/fonts/unbounded-latin-700-normal.woff2"];

export function layout({ ctx, body, css, js, lcpImage, inmersiva }: LayoutArgs) {
  const { locale, t, meta } = ctx;
  const showTheme = config.theme.switcher;

  return html`<!doctype html>
<html lang="${locale}" data-theme-default="${config.theme.default}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${config.locales.length > 1 ? idiomaBoot() : ""}
${themeBoot(config.theme.default, showTheme, inmersiva)}
<meta name="color-scheme" content="${config.theme.default === "system" || showTheme ? "light dark" : config.theme.default}">
<meta name="theme-color" content="${config.themeColor.dark}">
${seoHead(meta, locale)}
<link rel="icon" href="/favicon.ico?v=2" sizes="48x48">
<link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
${FUENTES_PRECARGA.map((f) => html`<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`)}
${lcpImage ? preloadImage(lcpImage.src, lcpImage.sizes) : ""}
${css.inline ? raw(`<style>${css.inline}</style>`) : html`<link rel="stylesheet" href="${css.href}">`}
<script type="module" src="${js}"></script>
${baseSchemas(meta, locale, t)}
</head>
<body${inmersiva ? raw(' class="inmersiva"') : ""}>
<a class="skip-link" href="#main">${t("a11y.skip")}</a>
${inmersiva ? "" : html`
<header class="barra barra-pagina">
  <a class="marca" href="${localePath(locale)}" aria-label="${t("a11y.inicio")}">${marcaBarra()}</a>
  <div class="barra-der">${selectorIdioma(locale, t, meta.slug)}<a class="btn btn-2" href="${localePath(locale)}#contacto">${t("top.contacto")}</a></div>
</header>`}
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="container footer-inner">
    <p>© ${new Date().getFullYear()} ${config.name}. ${t("footer.rights")} · <a href="${localePath(locale, "privacidad")}">${t("footer.privacidad")}</a></p>
    ${config.social.length ? html`
    <ul class="social" role="list">
      ${config.social.map((s) => html`<li><a href="${s.url}" target="_blank" rel="noopener me"
          aria-label="${s.label ?? networkName[s.network]}">${icon(s.network)}</a></li>`)}
    </ul>` : ""}
  </div>
</footer>
</body>
</html>`;
}
