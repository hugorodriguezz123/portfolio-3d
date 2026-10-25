import { html, raw, attrs } from "../lib/html";
import { img } from "../lib/images";
import { translator } from "../lib/i18n";
import { marca, marcaBarra } from "../lib/marca";
import { selectorIdioma } from "../lib/idiomas";
import { ICONOS_TEC } from "../lib/tecnologias-iconos";
import type { RenderCtx } from "../lib/layout";
import { FOTO, formulario } from "./oficina";

/**
 * Vista clásica (sin 3D): la que ven los celulares, quien elige "Ver sin 3D" y quien navega sin JavaScript.
 * Una landing de secciones: portada, nosotros, servicios, portafolio, río de tecnologías y contacto,
 * separadas por curvas con una línea verde → azul → rojo (los colores de la luz de la foto principal).
 * Los textos son los mismos de la oficina (src/i18n/*.json); solo los encabezados propios están en "clasica".
 */

interface Servicio { id: string; nombre: string; titulo?: string; texto: string; lista: string[]; nota?: string; video?: string }
interface Proyecto { nombre: string; area: string; anio: string; texto: string; chips: string[]; servicio: string; video?: string; imagen?: string; portada?: string; url?: string; conjunto?: string; anexo?: boolean }
interface Persona { id: string; nombre: string; cargo: string; foto: string; fotoAlt: string; texto: string; lista: string[]; chips: string[] }

const dos = (n: number) => String(n).padStart(2, "0");
const eyebrow = (texto: string) => html`<p class="cl-eyebrow">${texto}</p>`;
const flecha = raw(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`);
const cubo = raw(`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>`);

/** Curva entre dos secciones (de un fondo al siguiente) con la línea de color de la marca. */
const CURVAS = ["M0,70 C220,18 470,12 720,46 C970,80 1220,96 1440,38", "M0,40 C240,96 480,100 720,62 C960,24 1200,16 1440,64"];
function curva(de: "a" | "b", a: "a" | "b", v: 0 | 1 = 0) {
  const d = CURVAS[v]!;
  return raw(`<div class="cl-curva" style="--de:var(--cl-${de});--a:var(--cl-${a})" aria-hidden="true"><svg viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false"><path class="cl-curva-fondo" d="${d} L1440,120 L0,120 Z"/><path class="cl-curva-brillo" d="${d}"/><path class="cl-curva-linea" d="${d}"/></svg></div>`);
}
const defsCurva = raw(`<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="clLinea" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2ee59d"/><stop offset=".5" stop-color="#4c9dff"/><stop offset="1" stop-color="#ff4d5a"/></linearGradient></defs></svg>`);

/** Video corto que se reproduce solo cuando está a la vista (main.ts); sin JavaScript queda la imagen. */
function videoPerezoso(src: string, poster: string, alt: string) {
  return html`<div class="cl-media"><img src="${poster}" alt="${alt}" loading="lazy" decoding="async" width="800" height="450"><video muted loop playsinline preload="none" data-src="${src}" aria-hidden="true"></video></div>`;
}

/* ---------- Barra superior ---------- */
function barra({ t, locale }: RenderCtx) {
  const enlaces = ["nosotros", "servicios", "portafolio", "tecnologias", "contacto"];
  const nav = enlaces.map((id) => html`<a href="#${id}">${t(`clasica.nav.${id}`)}</a>`);
  return html`<header class="cl-barra">
    <a class="marca" href="#inicio" aria-label="${t("a11y.inicio")}">${marcaBarra()}</a>
    <nav class="cl-nav" aria-label="${t("a11y.mainNav")}">${nav}</nav>
    <div class="cl-barra-der">
      <button class="btn btn-2 cl-btn-3d" type="button" data-cambiar-modo="3d" data-con-webgl>${cubo}<span>${t("clasica.ver3d")}</span></button>
      ${selectorIdioma(locale, t)}
      <details class="cl-menu">
        <summary aria-label="${t("a11y.menu")}"><span></span><span></span><span></span></summary>
        <nav class="cl-menu-lista" aria-label="${t("a11y.mainNav")}">
          ${nav}
          <button class="btn btn-2" type="button" data-cambiar-modo="3d" data-con-webgl>${cubo}<span>${t("clasica.ver3d")}</span></button>
        </nav>
      </details>
    </div>
  </header>`;
}

/* ---------- Portada ---------- */
function portada({ t }: RenderCtx) {
  return html`<section class="cl-portada" id="inicio" aria-labelledby="cl-titulo">
    ${img({ src: FOTO, alt: t("portada.fotoAlt"), sizes: "(max-width: 760px) 100vw, 60vw", class: "cl-portada-foto" })}
    <div class="cl-portada-velo" aria-hidden="true"></div>
    <div class="cl-contenedor cl-portada-texto">
      <p class="ceja mono">${t("portada.ceja")}</p>
      <h1 id="cl-titulo" class="h1 display">${marca()}</h1>
      <p class="cl-lead">${t("portada.lead")}</p>
      <div class="acciones">
        <a class="btn btn-1" href="#contacto">${t("portada.contacto")} ${flecha}</a>
        <a class="btn btn-2" href="#servicios">${t("clasica.verServicios")}</a>
      </div>
      <ul class="servicios-linea mono" aria-label="${t("servicios.titulo")}">${t.list<string>("portada.servicios").map((s) => html`<li>${s}</li>`)}</ul>
    </div>
    <a class="cl-bajar" href="#nosotros" aria-label="${t("clasica.nav.nosotros")}"><span></span></a>
  </section>`;
}

/* ---------- Nosotros ---------- */
function nosotros({ t }: RenderCtx) {
  const ficha = t.list<{ dato: string; valor: string }>("nosotros.ficha");
  const equipo = t.list<Persona>("nosotros.equipo");
  return html`<section class="cl-seccion cl-fondo-b" id="nosotros" aria-labelledby="cl-nosotros-t">
    <div class="cl-contenedor cl-nosotros">
      <div class="cl-nosotros-texto revelar">
        ${eyebrow(t("clasica.nav.nosotros"))}
        <h2 id="cl-nosotros-t" class="cl-h2">${t("clasica.nosotros.titulo")}</h2>
        <p class="cl-txt">${t("nosotros.texto")}</p>
        <ul class="cl-lista">${t.list<string>("nosotros.lista").map((l) => html`<li>${l}</li>`)}</ul>
        <dl class="cl-datos">${ficha.map((f) => html`<div><dt>${f.dato}</dt><dd>${f.valor}</dd></div>`)}</dl>
      </div>
      <div class="cl-equipo">
        ${equipo.map((p) => html`<article class="cl-persona revelar">
          <div class="cl-persona-foto">${img({ src: p.foto, alt: p.fotoAlt, sizes: "220px" })}</div>
          <div class="cl-persona-info">
            <h3>${p.nombre}</h3>
            <p class="cl-cargo mono">${p.cargo}</p>
            <p>${p.texto}</p>
            <ul class="chips mono" aria-label="${t("nosotros.habilidades")}">${p.chips.slice(0, 5).map((c) => html`<li>${c}</li>`)}</ul>
            <details class="cl-mas"><summary>${t("clasica.nosotros.experiencia")}</summary><ul class="cl-lista">${p.lista.map((l) => html`<li>${l}</li>`)}</ul></details>
          </div>
        </article>`)}
      </div>
    </div>
  </section>`;
}

/* ---------- Servicios ---------- */
function servicios({ t }: RenderCtx) {
  const items = t.list<Servicio>("servicios.items");
  return html`<section class="cl-seccion cl-fondo-a" id="servicios" aria-labelledby="cl-servicios-t">
    <div class="cl-contenedor">
      <div class="cl-cabeza revelar">
        ${eyebrow(t("clasica.nav.servicios"))}
        <h2 id="cl-servicios-t" class="cl-h2">${t("clasica.servicios.titulo")}</h2>
        <p class="cl-txt">${t("clasica.servicios.lead")}</p>
      </div>
      <div class="cl-servicios">
        ${items.map((s, k) => html`<article class="cl-tarjeta revelar" id="servicio-cl-${s.id}">
          ${s.video ? videoPerezoso(s.video, s.video.replace("/videos/", "/images/").replace(/\.mp4$/, ".webp"), s.titulo ?? s.nombre) : ""}
          <div class="cl-tarjeta-cuerpo">
            <p class="cl-num mono">${dos(k + 1)}</p>
            <h3>${s.titulo ?? s.nombre}</h3>
            <p>${s.texto}</p>
            <ul class="cl-lista">${s.lista.slice(0, 4).map((l) => html`<li>${l}</li>`)}</ul>
            ${s.nota ? html`<p class="cl-nota"><b class="mono">${t("servicios.entrega")}</b> ${s.nota}</p>` : ""}
            <a class="cl-enlace" href="#contacto" data-cotizar="${s.id}">${t("servicios.cotizar")} ${flecha}</a>
          </div>
        </article>`)}
      </div>
    </div>
  </section>`;
}

/* ---------- Portafolio ---------- */
function portafolio({ t }: RenderCtx) {
  const items = t.list<Proyecto>("proyectos.items");
  const media = (p: Proyecto) => {
    if (p.portada || p.imagen) return html`<div class="cl-media"><img src="${p.portada ?? p.imagen}" alt="${p.nombre}" loading="lazy" decoding="async" width="1600" height="524"></div>`;
    if (p.video) return videoPerezoso(p.video, p.video.replace("/videos/", "/images/proyectos/").replace(/\.mp4$/, ".webp"), p.nombre);
    return "";
  };
  return html`<section class="cl-seccion cl-fondo-b" id="portafolio" aria-labelledby="cl-portafolio-t">
    <div class="cl-contenedor">
      <div class="cl-cabeza revelar">
        ${eyebrow(t("clasica.nav.portafolio"))}
        <h2 id="cl-portafolio-t" class="cl-h2">${t("clasica.portafolio.titulo")}</h2>
        <p class="cl-txt">${t("clasica.portafolio.lead")}</p>
      </div>
      <div class="cl-proyectos">
        ${items.map((p) => html`<article class="cl-proyecto revelar${p.anexo ? " cl-anexo" : ""}">
          ${media(p)}
          <div class="cl-tarjeta-cuerpo">
            <p class="cl-area mono">${p.area} · ${p.anio}</p>
            <h3>${p.nombre}</h3>
            ${p.conjunto ? html`<p class="cl-conjunto mono">${p.conjunto}</p>` : ""}
            <p class="cl-resumen">${p.texto}</p>
            <ul class="chips mono" aria-label="${t("a11y.tecnologias")}">${p.chips.slice(0, 5).map((c) => html`<li>${c}</li>`)}</ul>
            <div class="cl-acciones">
              ${p.url ? html`<a class="cl-enlace" href="${p.url}" target="_blank" rel="noopener">${p.url.replace(/^https?:\/\//, "")} ↗</a>` : ""}
              <a class="cl-enlace" href="#contacto" data-cotizar="${p.servicio}">${t("proyectos.quiero")} ${flecha}</a>
            </div>
          </div>
        </article>`)}
      </div>
    </div>
  </section>`;
}

/* ---------- Río de tecnologías ---------- */
// Los logos viven en un solo archivo cacheable (/images/tecnologias.svg, lo genera build.ts) y se usan con <use>
export const idTec = (nombre: string) => "tec-" + nombre.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");
export function spriteTecnologias() {
  return `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(ICONOS_TEC).map(([c, i]) => i.d
    ? `<symbol id="${idTec(c)}" viewBox="0 0 24 24"><path fill="currentColor" d="${i.d}"/></symbol>`
    : `<symbol id="${idTec(c)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${i.trazo}</symbol>`).join("")}</svg>`;
}
function icono(nombre: string) {
  if (!ICONOS_TEC[nombre]) return raw(`<span class="cl-tec-monograma">${nombre.slice(0, 2)}</span>`);
  return raw(`<svg aria-hidden="true"><use href="/images/tecnologias.svg#${idTec(nombre)}"/></svg>`);
}
function tecnologias({ t }: RenderCtx) {
  // Los íconos se buscan por el nombre en español (misma posición en en.json); se muestra el nombre del idioma actual
  const es = translator("es").list<{ chips: string[] }>("tecnologias.grupos");
  const grupos = t.list<{ titulo: string; chips: string[] }>("tecnologias.grupos");
  const vistos = new Set<string>();
  const todas: { clave: string; nombre: string }[] = [];
  grupos.forEach((g, i) => g.chips.forEach((nombre, k) => {
    const clave = es[i]?.chips[k] ?? nombre;
    if (!vistos.has(clave)) { vistos.add(clave); todas.push({ clave, nombre }); }
  }));
  const carriles = [todas.filter((_, k) => k % 2 === 0), todas.filter((_, k) => k % 2 === 1)];
  // Cada carril va dos veces seguido: al desplazarse la mitad, el ciclo empata sin saltos
  const carril = (lista: typeof todas, n: number) => html`<div class="cl-carril cl-carril-${n}"><ul class="cl-flujo">${[...lista, ...lista].map((x, k) =>
    html`<li${attrs({ "aria-hidden": k >= lista.length ? "true" : undefined })}><span class="cl-tec-ico">${icono(x.clave)}</span><span class="cl-tec-nombre">${x.nombre}</span></li>`)}</ul></div>`;
  return html`<section class="cl-seccion cl-fondo-a cl-tec" id="tecnologias" aria-labelledby="cl-tec-t">
    <div class="cl-contenedor"><div class="cl-cabeza revelar">
      ${eyebrow(t("clasica.nav.tecnologias"))}
      <h2 id="cl-tec-t" class="cl-h2">${t("tecnologias.titulo")}</h2>
      <p class="cl-txt">${t("tecnologias.texto")}</p>
    </div></div>
    <div class="cl-rio">
      <svg class="cl-agua" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0,60 C180,40 360,80 540,60 C720,40 900,80 1080,60 C1260,40 1440,80 1620,60 C1800,40 1980,80 2160,60 C2340,40 2520,80 2880,60"/>
        <path d="M0,140 C180,160 360,120 540,140 C720,160 900,120 1080,140 C1260,160 1440,120 1620,140 C1800,160 1980,120 2160,140 C2340,160 2520,120 2880,140"/>
        <path d="M0,100 C240,85 480,115 720,100 C960,85 1200,115 1440,100 C1680,85 1920,115 2160,100 C2400,85 2640,115 2880,100"/>
      </svg>
      ${carril(carriles[0]!, 1)}
      ${carril(carriles[1]!, 2)}
    </div>
  </section>`;
}

/* ---------- Contacto ---------- */
function contacto(ctx: RenderCtx) {
  const { t } = ctx;
  const directo = t.list<{ dato: string; valor: string; href?: string }>("contact.directo");
  const ICO: Record<number, string> = {
    0: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    1: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    2: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  };
  return html`<section class="cl-seccion cl-fondo-b" id="contacto" aria-labelledby="cl-contacto-t">
    <div class="cl-contenedor cl-contacto">
      <div class="cl-contacto-texto revelar">
        ${eyebrow(t("clasica.nav.contacto"))}
        <h2 id="cl-contacto-t" class="cl-h2">${t("contact.title")}</h2>
        <p class="cl-txt">${t("clasica.contacto.lead")}</p>
        <ul class="cl-directo">
          ${directo.map((d, k) => html`<li><span class="cl-directo-ico">${raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k] ?? ICO[2]}</svg>`)}</span>
            <span><small>${d.dato}</small>${d.href ? html`<a href="${d.href}">${d.valor}</a>` : html`<b>${d.valor}</b>`}</span></li>`)}
          <li><span class="cl-directo-ico cl-wa">${icono("WhatsApp")}</span>
            <span><small>WhatsApp</small><a href="https://wa.me/573160978783" target="_blank" rel="noopener">${t("clasica.contacto.whatsapp")}</a></span></li>
        </ul>
      </div>
      <div class="cl-contacto-form revelar">${formulario(ctx)}</div>
    </div>
  </section>`;
}

export function vistaClasica(ctx: RenderCtx) {
  return html`<div class="clasica">
    ${defsCurva}
    ${barra(ctx)}
    ${portada(ctx)}
    ${curva("a", "b")}
    ${nosotros(ctx)}
    ${curva("b", "a", 1)}
    ${servicios(ctx)}
    ${curva("a", "b")}
    ${portafolio(ctx)}
    ${curva("b", "a", 1)}
    ${tecnologias(ctx)}
    ${curva("a", "b")}
    ${contacto(ctx)}
  </div>`;
}
