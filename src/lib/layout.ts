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
 * Script bloqueante MÍNIMO en <head>: fija el tema y marca la página con .js y, si toca, .modo-3d antes del primer
 * pintado. Modo: ?modo=3d|clasico o la elección guardada; si no hay, clásico en celulares y tabletas y 3D en
 * computadores. Sin .modo-3d se ve la vista clásica (también sin JavaScript). main.ts quita .modo-3d si no hay WebGL.
 */
const themeBoot = (def: string, sw: boolean, inmersiva = false) =>
  raw(`<script>(function(){var d=document.documentElement,t="${def}";try{${sw ? 't=localStorage.getItem("theme")||t;' : ""}}catch(e){}if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;d.classList.add("js")${inmersiva ? ';var q=new URLSearchParams(location.search).get("modo"),m=q;try{if(q==="3d"||q==="clasico"){localStorage.setItem("modo",q);history.replaceState(null,"",location.pathname+location.hash)}m=localStorage.getItem("modo")||q}catch(e){}if(m!=="3d"&&m!=="clasico")m=matchMedia("(max-width: 760px), (hover: none) and (pointer: coarse)").matches?"clasico":"3d";if(m==="3d")d.classList.add("modo-3d")' : ""}})()</script>`);

/**
 * Idioma automático (va primero en el <head>, antes de pintar): usa el primer idioma del navegador que sea español
 * o inglés; si no hay ninguno, inglés. Si la persona eligió un idioma con el selector (localStorage "idioma"), manda
 * esa elección. No redirige a buscadores, para que indexen cada versión por separado. Conserva ?query y #sección.
 */
const idiomaBoot = () =>
  raw(`<script>(function(){try{if(/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent))return;var p=location.pathname,en=p==="/en"||p.indexOf("/en/")===0,q=null;try{q=localStorage.getItem("idioma")}catch(e){}if(q!=="es"&&q!=="en"){q="en";var ls=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""];for(var i=0;i<ls.length;i++){var l=String(ls[i]).toLowerCase();if(l.indexOf("es")===0){q="es";break}if(l.indexOf("en")===0)break}}var resto=location.search+location.hash;if(q==="en"&&!en)location.replace("/en"+(p==="/"?"/":p)+resto);else if(q==="es"&&en)location.replace((p==="/en"?"/":p.slice(3))+resto)}catch(e){}})()</script>`);

/** Fuentes autoalojadas que conviene precargar (texto visible en la portada). */
const FUENTES_PRECARGA = ["/fonts/manrope-latin-400-normal.woff2", "/fonts/unbounded-latin-700-normal.woff2"];

/** Pie de página: marca, navegación, servicios, contacto y barra legal. Se oculta dentro de la oficina 3D. */
function piePagina({ t, locale }: RenderCtx) {
  const inicio = localePath(locale);
  const secciones = ["nosotros", "servicios", "portafolio", "tecnologias", "contacto"];
  const servicios = t.list<{ id: string; nombre: string }>("servicios.items");
  const directo = t.list<{ dato: string; valor: string; href?: string }>("contact.directo");
  return html`<footer class="site-footer">
  <div class="container pie">
    <div class="pie-marca">
      <a class="marca" href="${inicio}" aria-label="${t("a11y.inicio")}">${marcaBarra()}</a>
      <p>${t("footer.descripcion")}</p>
      ${config.social.length ? html`<ul class="social" role="list">${config.social.map((s) => html`<li><a href="${s.url}" target="_blank" rel="noopener me"
          aria-label="${s.label ?? networkName[s.network]}">${icon(s.network)}</a></li>`)}</ul>` : ""}
    </div>
    <nav class="pie-col pie-nav" aria-label="${t("footer.navegacion")}">
      <h2>${t("footer.navegacion")}</h2>
      <ul>${secciones.map((id) => html`<li><a href="${inicio}#${id}">${t(`clasica.nav.${id}`)}</a></li>`)}</ul>
    </nav>
    <div class="pie-col pie-servicios">
      <h2>${t("footer.servicios")}</h2>
      <ul>${servicios.map((s) => html`<li><a href="${inicio}#servicio-cl-${s.id}">${s.nombre}</a></li>`)}</ul>
    </div>
    <div class="pie-col pie-contacto">
      <h2>${t("footer.contacto")}</h2>
      <ul>
        ${directo.map((d) => html`<li>${d.href ? html`<a href="${d.href}">${d.valor}</a>` : d.valor}</li>`)}
        <li><a href="https://wa.me/573160978783" target="_blank" rel="noopener">${t("footer.whatsapp")} ↗</a></li>
      </ul>
    </div>
  </div>
  <div class="container pie-legal">
    <p>© ${new Date().getFullYear()} ${config.name}. ${t("footer.rights")}</p>
    <p><a href="${localePath(locale, "privacidad")}">${t("footer.privacidad")}</a> · ${t("footer.hecho")} · <a href="#main">${t("footer.arriba")} ↑</a></p>
  </div>
</footer>`;
}

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
${piePagina(ctx)}
</body>
</html>`;
}
