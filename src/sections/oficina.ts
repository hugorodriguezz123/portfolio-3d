import config from "../../site.config";
import { html, attrs } from "../lib/html";
import { img } from "../lib/images";
import { localePath } from "../lib/i18n";
import { marca, marcaBarra } from "../lib/marca";
import { selectorIdioma } from "../lib/idiomas";
import type { RenderCtx } from "../lib/layout";

/**
 * La oficina 3D y todo su contenido.
 * Todo el texto está en el HTML (bueno para SEO y para quien navega sin JavaScript):
 *  - Con JS y WebGL (.js): modo inmersivo; src/client/main.ts muestra un elemento [data-vista] a la vez.
 *  - Sin JS o sin WebGL (.sin-3d): modo documento; las secciones se leen una debajo de otra.
 * Los textos viven en src/i18n/es.json.
 */

export const FOTO = "/images/fundadores.jpg";
export const FOTO_SIZES = "(max-width: 760px) 100vw, 56vw";

interface Item { id: string; nombre: string; titulo?: string; texto: string; lista: string[]; nota?: string; chips: string[]; video?: string }
interface Proyecto { nombre: string; area: string; cliente: string; anio: string; texto: string; lista: string[]; chips: string[]; servicio: string; video?: string; imagen?: string; url?: string; menu?: string; anexo?: boolean; conjunto?: string }
interface MenuItem { id: string; label: string; tecla: string; teclaAria: string }
interface Persona { id: string; nombre: string; corto: string; cargo: string; foto: string; fotoAlt: string; texto: string; lista: string[]; chips: string[] }

const dos = (n: number) => String(n).padStart(2, "0");

function cabecera(izq: string, der: string) {
  return html`<div class="panel-cab mono"><span>${izq}</span><span>${der}</span></div>`;
}
function lista(items: string[]) {
  return html`<ul class="lista">${items.map((i) => html`<li>${i}</li>`)}</ul>`;
}
function chips(items: string[], label: string) {
  return html`<ul class="chips mono" aria-label="${label}">${items.map((i) => html`<li>${i}</li>`)}</ul>`;
}

/* ---------- Portada ---------- */
function portada({ t }: RenderCtx) {
  return html`<section class="portada is-on" data-vista="portada" aria-labelledby="titulo-portada">
    ${img({ src: FOTO, alt: t("portada.fotoAlt"), priority: true, sizes: FOTO_SIZES, class: "foto" })}
    <div class="velo" aria-hidden="true"></div>
    <div class="hero">
      <p class="ceja mono">${t("portada.ceja")}</p>
      <h1 id="titulo-portada" class="h1 display">${marca()}</h1>
      <p class="lead">${t("portada.lead")}</p>
      <div class="acciones">
        <a class="btn btn-1" href="#servicios" data-ir="oficina" data-entrar>${t("portada.entrar")}</a>
        <a class="btn btn-2" href="#contacto" data-ir="contacto">${t("portada.contacto")}</a>
      </div>
      <ul class="servicios-linea mono" aria-label="${t("servicios.titulo")}">
        ${t.list<string>("portada.servicios").map((s) => html`<li>${s}</li>`)}
      </ul>
    </div>
    <!-- Carga de la oficina 3D: al centro de la pantalla para que se vea de inmediato si todavía está cargando -->
    <div class="carga" data-solo-3d>
      <p class="carga-pct" data-carga-pct aria-hidden="true">0%</p>
      <div class="barra-carga" aria-hidden="true"><span data-carga-barra></span></div>
      <p class="carga-txt mono" role="status" aria-live="polite" data-carga-txt>${t("portada.cargando")}</p>
      <p class="carga-error" data-carga-error hidden>${t("portada.error")} <button class="btn btn-2" type="button" data-sin-3d>${t("portada.sin3d")}</button></p>
    </div>
    <button class="bajar mono" type="button" data-ir="oficina" data-solo-3d>
      <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8"/><line x1="9" y1="6" x2="9" y2="11" stroke-linecap="round"/></svg>
      ${t("portada.bajar")}
    </button>
  </section>`;
}

/* ---------- Barra superior ---------- */
function barra({ t, locale }: RenderCtx) {
  return html`<header class="barra">
    <a class="marca" href="#main" data-ir="portada" aria-label="${t("a11y.inicio")}">${marcaBarra()}</a>
    <div class="barra-der">${selectorIdioma(locale, t)}<a class="btn btn-2" href="#contacto" data-ir="contacto">${t("top.contacto")}</a></div>
  </header>`;
}

/* ---------- Letreros de neón (menús) ---------- */
function menus({ t }: RenderCtx) {
  const items = t.list<MenuItem>("menu.items");
  const servicios = t.list<Item>("servicios.items");
  const proyectos = t.list<Proyecto>("proyectos.items");
  const perfiles = [{ id: "estudio", nombre: t("nosotros.estudio") }, ...t.list<Persona>("nosotros.equipo").map((p) => ({ id: p.id, nombre: p.corto }))];
  const tecla = (texto: string, aria = "") => html`<span class="tecla mono"${attrs({ "aria-label": aria || undefined })}>${texto}</span>`;
  const volver = html`<span class="neon-linea corta" aria-hidden="true"></span>
      <a class="item" href="#main" data-ir="oficina"><span>${t("menu.todas")}</span>${tecla("Esc")}</a>`;
  return html`
  <div class="menu" data-vista="menu-principal">
    <nav class="letrero" aria-label="${t("a11y.mainNav")}">
      <p class="letrero-tit">${marca("lockup-letrero")}</p>
      <span class="neon-linea" aria-hidden="true"></span>
      ${items.map((i) => i.id === "mapa"
        ? html`<a class="item" href="#contacto" data-abrir-mapa data-item="mapa" data-solo-3d><span>${i.label}</span>${tecla(i.tecla, t(i.teclaAria))}</a>`
        : html`<a class="item" href="#${i.id}" data-ir="${i.id}" data-item="${i.id}"><span>${i.label}</span>${tecla(i.tecla, i.teclaAria ? t(i.teclaAria) : "")}</a>`)}
      <span class="neon-linea corta" aria-hidden="true"></span>
      <a class="item" href="#main" data-ir="oficina" data-item="oficina" data-solo-3d><span>${t("menu.vista")}</span>${tecla("Esc")}</a>
      <a class="item" href="#main" data-ir="portada" data-solo-3d><span>${t("menu.inicio")}</span>${tecla("↖")}</a>
    </nav>
  </div>
  <div class="menu" data-vista="menu-servicios" data-solo-3d>
    <nav class="letrero" aria-label="${t("menu.servicios.titulo")}">
      <p class="letrero-tit"><span>${t("menu.servicios.titulo")}</span></p>
      <p class="letrero-sub mono">${t("menu.servicios.sub")}</p>
      <span class="neon-linea" aria-hidden="true"></span>
      ${servicios.map((s, k) => html`<a class="item" href="#servicio-${s.id}" data-servicio-ver="${s.id}"><span>${s.nombre}</span>${tecla(dos(k + 1))}</a>`)}
      ${volver}
    </nav>
  </div>
  <div class="menu" data-vista="menu-proyectos" data-solo-3d>
    <nav class="letrero" aria-label="${t("menu.proyectos.titulo")}">
      <p class="letrero-tit"><span>${t("menu.proyectos.titulo")}</span></p>
      <p class="letrero-sub mono">${t("menu.proyectos.sub")}</p>
      <span class="neon-linea" aria-hidden="true"></span>
      ${proyectos.map((p, k) => html`<a class="item${p.anexo ? " item-anexo" : ""}" href="#proyecto-${k + 1}" data-proyecto-ver="${k}"><span>${p.menu ?? p.nombre}</span>${tecla(dos(k + 1))}</a>`)}
      ${volver}
    </nav>
  </div>
  <div class="menu" data-vista="menu-nosotros" data-solo-3d>
    <nav class="letrero" aria-label="${t("nosotros.menu.titulo")}">
      <p class="letrero-tit"><span>${t("nosotros.menu.titulo")}</span></p>
      <p class="letrero-sub mono">${t("nosotros.menu.sub")}</p>
      <span class="neon-linea" aria-hidden="true"></span>
      ${perfiles.map((p, k) => html`<a class="item" href="#nosotros-${p.id}" data-nosotros-ver="${p.id}"><span>${p.nombre}</span>${tecla(dos(k + 1))}</a>`)}
      ${volver}
    </nav>
  </div>`;
}

/* ---------- Controles del recorrido (solo modo 3D) ---------- */
function controles({ t }: RenderCtx) {
  const objetos = t.list<string>("pista.objetos");
  return html`
  <div class="pad" role="group" aria-label="${t("a11y.pad")}" data-vista="pad" data-solo-3d>
    <button type="button" style="grid-column:2;grid-row:1" data-pad="arriba" aria-label="${t("a11y.padArriba")}">↑</button>
    <button type="button" style="grid-column:1;grid-row:2" data-pad="izq" aria-label="${t("a11y.padIzq")}"
      data-aria-normal="${t("a11y.padIzq")}" data-aria-proyectos="${t("a11y.padIzqProyectos")}" data-aria-servicios="${t("a11y.padIzqServicios")}" data-aria-nosotros="${t("a11y.padIzqNosotros")}">←</button>
    <button type="button" style="grid-column:2;grid-row:2" data-pad="abajo" aria-label="${t("a11y.padAbajo")}">↓</button>
    <button type="button" style="grid-column:3;grid-row:2" data-pad="der" aria-label="${t("a11y.padDer")}"
      data-aria-normal="${t("a11y.padDer")}" data-aria-proyectos="${t("a11y.padDerProyectos")}" data-aria-servicios="${t("a11y.padDerServicios")}" data-aria-nosotros="${t("a11y.padDerNosotros")}">→</button>
  </div>
  <p class="pista" data-vista="pista" data-solo-3d>${t("pista.antes")} ${objetos.map((o, k) =>
    html`<b>${o}</b>${k < objetos.length - 2 ? ", " : k === objetos.length - 2 ? " o " : ""}`)}, ${t("pista.despues")} <span class="mono">${t("pista.teclas")}</span></p>
  <div class="hud" data-hud aria-hidden="true" data-solo-3d><i class="e1"></i><i class="e2"></i><i class="e3"></i><i class="e4"></i><span class="hud-tag mono" data-hud-tag data-abrir="${t("hud.abrir")}"></span></div>`;
}

/* ---------- Paneles ---------- */
function panelServicios({ t }: RenderCtx) {
  const items = t.list<Item>("servicios.items");
  return html`<section class="panel" id="servicios" data-vista="servicios" data-scroll aria-labelledby="servicios-titulo">
    <h2 id="servicios-titulo" class="titulo-seccion">${t("servicios.titulo")}</h2>
    ${items.map((s, k) => html`<article class="cuerpo" id="servicio-${s.id}" data-vista="servicio-${s.id}"${attrs({ "data-pantalla": s.video })} aria-labelledby="sv-${s.id}">
      ${cabecera(`${t("servicios.cab")} ${dos(k + 1)} / ${dos(items.length)}`, t("servicios.lugar"))}
      <h3 id="sv-${s.id}" class="panel-titulo">${s.titulo ?? s.nombre}</h3>
      <p>${s.texto}</p>
      <p class="sub mono">${t("servicios.queHacemos")}</p>
      ${lista(s.lista)}
      ${s.nota ? html`<p class="nota"><b class="mono">${t("servicios.entrega")}</b>${s.nota}</p>` : ""}
      ${chips(s.chips, t("a11y.areas"))}
      <div class="panel-pie">
        <button class="btn btn-2" type="button" data-servicio-paso="-1" data-solo-3d>${t("servicios.anterior")}</button>
        <button class="btn btn-2" type="button" data-servicio-paso="1" data-solo-3d>${t("servicios.siguiente")}</button>
        <a class="btn btn-1" href="#contacto" data-ir="contacto" data-cotizar="${s.id}">${t("servicios.cotizar")}</a>
      </div>
    </article>`)}
  </section>`;
}

function panelProyectos({ t }: RenderCtx) {
  const items = t.list<Proyecto>("proyectos.items");
  return html`<section class="panel" id="proyectos" data-vista="proyectos" data-scroll aria-labelledby="proyectos-titulo">
    <h2 id="proyectos-titulo" class="titulo-seccion">${t("proyectos.titulo")}</h2>
    ${items.map((p, k) => html`<article class="cuerpo" id="proyecto-${k + 1}" data-vista="proyecto-${k}"${attrs({ "data-pantalla": p.video || p.imagen || undefined })} aria-labelledby="pr-${k}">
      ${cabecera(`${t("proyectos.cab")} ${dos(k + 1)} / ${dos(items.length)}`, t("proyectos.lugar"))}
      <h3 id="pr-${k}" class="panel-titulo">${p.nombre}</h3>
      <dl class="ficha">
        <dt>${t("proyectos.area")}</dt><dd>${p.area}</dd>
        <dt>${t("proyectos.cliente")}</dt><dd>${p.cliente}</dd>
        <dt>${t("proyectos.anio")}</dt><dd>${p.anio}</dd>
        ${p.conjunto ? html`<dt>${t("proyectos.conjunto")}</dt><dd>${p.conjunto}</dd>` : ""}
        ${p.url ? html`<dt>${t("proyectos.sitio")}</dt><dd><a href="${p.url}" target="_blank" rel="noopener">${p.url.replace(/^https?:\/\//, "")} ↗</a></dd>` : ""}
      </dl>
      <p>${p.texto}</p>
      <p class="sub mono">${t("proyectos.queHicimos")}</p>
      ${lista(p.lista)}
      ${chips(p.chips, t("a11y.tecnologias"))}
      <div class="panel-pie">
        <button class="btn btn-2" type="button" data-proyecto-paso="-1" data-solo-3d>${t("proyectos.anterior")}</button>
        <button class="btn btn-2" type="button" data-proyecto-paso="1" data-solo-3d>${t("proyectos.siguiente")}</button>
        <a class="btn btn-1" href="#contacto" data-ir="contacto" data-cotizar="${p.servicio}">${t("proyectos.quiero")}</a>
      </div>
    </article>`)}
  </section>`;
}

function panelTecnologias({ t }: RenderCtx) {
  const grupos = t.list<{ titulo: string; texto?: string; chips: string[] }>("tecnologias.grupos");
  return html`<section class="panel" id="tecnologias" data-vista="tecnologias" data-scroll aria-labelledby="tecnologias-titulo">
    <div class="cuerpo">
      ${cabecera(t("tecnologias.cab"), t("tecnologias.lugar"))}
      <h2 id="tecnologias-titulo" class="panel-titulo">${t("tecnologias.titulo")}</h2>
      <p>${t("tecnologias.texto")}</p>
      ${grupos.map((g) => html`<div class="grupo"><h3 class="h3">${g.titulo}</h3>${g.texto ? html`<p class="grupo-txt">${g.texto}</p>` : ""}${chips(g.chips, g.titulo)}</div>`)}
      <div class="panel-pie" data-solo-3d>
        <button class="btn btn-2" type="button" data-ir="oficina">${t("tecnologias.volver")}</button>
        <button class="btn btn-1" type="button" data-ir="proyectos">${t("tecnologias.verProyectos")}</button>
      </div>
    </div>
  </section>`;
}

function panelNosotros({ t }: RenderCtx) {
  const ficha = t.list<{ dato: string; valor: string }>("nosotros.ficha");
  const equipo = t.list<Persona>("nosotros.equipo");
  const total = dos(equipo.length + 1);
  const pie = html`<div class="panel-pie">
        <button class="btn btn-2" type="button" data-nosotros-paso="-1" data-solo-3d>${t("nosotros.anterior")}</button>
        <button class="btn btn-2" type="button" data-nosotros-paso="1" data-solo-3d>${t("nosotros.siguiente")}</button>
        <a class="btn btn-2" href="#servicios" data-ir="servicios">${t("nosotros.verServicios")}</a>
        <a class="btn btn-1" href="#contacto" data-ir="contacto">${t("nosotros.hablemos")}</a>
      </div>`;
  return html`<section class="panel" id="nosotros" data-vista="nosotros" data-scroll aria-labelledby="nosotros-titulo">
    <h2 id="nosotros-titulo" class="titulo-seccion">${t("nosotros.menu.titulo")}</h2>
    <article class="cuerpo" id="nosotros-estudio" data-vista="nosotros-estudio" aria-labelledby="ns-estudio">
      ${cabecera(`${t("nosotros.cab")} 01 / ${total}`, t("nosotros.lugar"))}
      <h3 id="ns-estudio" class="panel-titulo">${t("nosotros.titulo")}</h3>
      ${img({ src: FOTO, alt: t("nosotros.fotoAlt"), sizes: "(max-width: 760px) 100vw, 440px", class: "retrato" })}
      <p class="pie-foto mono">${t("nosotros.pieFoto")}</p>
      <p>${t("nosotros.texto")}</p>
      <p class="sub mono">${t("nosotros.subtitulo")}</p>
      ${lista(t.list<string>("nosotros.lista"))}
      <dl class="ficha">${ficha.map((f) => html`<dt>${f.dato}</dt><dd>${f.valor}</dd>`)}</dl>
      ${pie}
    </article>
    ${equipo.map((p, k) => html`<article class="cuerpo" id="nosotros-${p.id}" data-vista="nosotros-${p.id}" aria-labelledby="ns-${p.id}">
      ${cabecera(`${t("nosotros.cab")} ${dos(k + 2)} / ${total}`, t("nosotros.lugar"))}
      <h3 id="ns-${p.id}" class="panel-titulo">${p.nombre}</h3>
      <p class="cargo mono">${p.cargo}</p>
      ${p.foto ? img({ src: p.foto, alt: p.fotoAlt, sizes: "(max-width: 760px) 100vw, 440px", class: "retrato retrato-persona" }) : ""}
      <p>${p.texto}</p>
      <p class="sub mono">${t("nosotros.experiencia")}</p>
      ${lista(p.lista)}
      <p class="sub mono">${t("nosotros.habilidades")}</p>
      ${chips(p.chips, t("nosotros.habilidades"))}
      ${pie}
    </article>`)}
  </section>`;
}

function panelTaller({ t }: RenderCtx) {
  const grupos = t.list<{ titulo: string; lista: string[] }>("taller.grupos");
  return html`<section class="panel" id="taller" data-vista="taller" data-scroll aria-labelledby="taller-titulo">
    <div class="cuerpo">
      ${cabecera(t("taller.cab"), t("taller.lugar"))}
      <h2 id="taller-titulo" class="panel-titulo">${t("taller.titulo")}</h2>
      <p>${t("taller.texto")}</p>
      ${grupos.map((g) => html`<div class="grupo"><h3 class="h3">${g.titulo}</h3>${lista(g.lista)}</div>`)}
      <div class="panel-pie">
        <a class="btn btn-2" href="#proyectos" data-ir="proyectos">${t("taller.verProyectos")}</a>
        <a class="btn btn-1" href="#contacto" data-ir="contacto">${t("taller.hablemos")}</a>
      </div>
    </div>
  </section>`;
}

/** Formulario progresivo: sin JS hace POST normal; con JS envía por fetch y muestra el estado. */
function panelContacto({ t, locale }: RenderCtx) {
  const c = config.contact;
  const honeypot: Record<string, string> = { formspree: "_gotcha", web3forms: "botcheck" };
  const servicios = t.list<{ id: string; label: string }>("contact.servicios");
  const directo = t.list<{ dato: string; valor: string; href?: string }>("contact.directo");
  return html`<section class="panel" id="contacto" data-vista="contacto" data-scroll aria-labelledby="contacto-titulo">
    <div class="cuerpo">
      ${cabecera(t("contact.cab"), t("contact.lugar"))}
      <h2 id="contacto-titulo" class="panel-titulo">${t("contact.title")}</h2>
      ${c.provider === "none" ? "" : html`
      <form class="form" method="post" action="${c.endpoint}" data-contact-form data-provider="${c.provider}" novalidate>
        ${c.provider === "web3forms" ? html`<input type="hidden" name="access_key" value="${c.accessKey ?? ""}"><input type="hidden" name="subject" value="${t("contact.asunto", { nombre: config.name })}">` : ""}
        <input type="hidden" name="_ts" value="">
        <div class="hp" aria-hidden="true"><label>Website<input type="text" name="${honeypot[c.provider] ?? "website"}" tabindex="-1" autocomplete="off"></label></div>
        <label class="field"><span>${t("contact.fields.name")}</span><input name="name" type="text" required autocomplete="name" maxlength="200"></label>
        <label class="field"><span>${t("contact.fields.email")}</span><input name="email" type="email" required autocomplete="email" maxlength="200"></label>
        <label class="field ancho"><span>${t("contact.fields.servicio")}</span><select name="servicio" data-servicio-form>
          ${servicios.map((s) => html`<option value="${s.label}" data-id="${s.id}">${s.label}</option>`)}
        </select></label>
        <label class="field ancho"><span>${t("contact.fields.message")}</span><textarea name="message" rows="4" required minlength="10" maxlength="5000"></textarea></label>
        <div class="form-pie ancho">
          <button class="btn btn-1" type="submit">${t("contact.send")}</button>
          <p class="form-status" role="status" aria-live="polite" data-form-status
             data-sending="${t("contact.sending")}" data-ok="${t("contact.ok")}" data-error="${t("contact.error")}"
             data-invalid="${t("contact.invalid")}"></p>
        </div>
        <p class="legal ancho">${t("contact.privacidad")} <a href="${localePath(locale, "privacidad")}">${t("contact.privacidadLink")}</a>.</p>
      </form>`}
      <ul class="directo">${directo.map((d) => html`<li>${d.dato} ${d.href ? html`<a href="${d.href}"><b>${d.valor}</b></a>` : html`<b>${d.valor}</b>`}</li>`)}</ul>
    </div>
  </section>`;
}

/** Ventana del mapa 3D: se abre al hacer clic en la pantalla del mapamundi (solo modo 3D). */
function modalMapa({ t }: RenderCtx) {
  return html`<div class="modal-mapa" data-modal-mapa data-scroll data-solo-3d hidden role="dialog" aria-modal="true" aria-labelledby="mapa-titulo">
    <div class="modal-caja">
      <div class="panel-cab mono"><span>${t("mapa.cab")}</span><button class="cerrar mono" type="button" data-cerrar-mapa aria-label="${t("mapa.cerrar")}">Esc ✕</button></div>
      <h2 id="mapa-titulo" class="panel-titulo">${t("mapa.titulo")}</h2>
      <canvas class="mapa-3d" data-mapa-canvas role="img" aria-label="${t("mapa.alt")}"></canvas>
      <p class="ayuda mono">${t("mapa.ayuda")}</p>
    </div>
  </div>`;
}

/** La app completa: escena 3D + capas de interfaz. */
export function oficina(ctx: RenderCtx) {
  return html`<div class="app" data-app>
    <canvas class="escena" data-escena aria-label="${ctx.t("a11y.escena")}" data-solo-3d></canvas>
    ${portada(ctx)}
    ${barra(ctx)}
    ${menus(ctx)}
    ${controles(ctx)}
    <div class="paneles">
      ${panelServicios(ctx)}
      ${panelProyectos(ctx)}
      ${panelTecnologias(ctx)}
      ${panelNosotros(ctx)}
      ${panelTaller(ctx)}
      ${panelContacto(ctx)}
    </div>
    ${modalMapa(ctx)}
  </div>`;
}

