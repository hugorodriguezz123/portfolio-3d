/**
 * Cliente de JHS Software Solutions. Todo es mejora progresiva:
 *  - Sin JavaScript la home se lee como documento (todas las secciones en el HTML).
 *  - Con JavaScript y WebGL se activa la oficina 3D. El motor (three.js + modelos) está en
 *    ./escena/escena.js y se descarga aparte, después de pintar la portada.
 */
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const raiz = document.documentElement;

/** Cambia este número cuando reemplaces un .glb en public/modelos (evita que el navegador use la copia vieja). */
const VERSION_MODELOS = "1";
const MODELOS = {
  oficina: `/modelos/oficina.glb?v=${VERSION_MODELOS}`,
  personajes: [`/modelos/personaje1.glb?v=${VERSION_MODELOS}`, `/modelos/personaje2.glb?v=${VERSION_MODELOS}`],
};

/**
 * Descargas de la oficina 3D: empiezan apenas carga la página, en paralelo con el código del motor
 * (antes esperaban a que el motor estuviera listo). Cada una informa su avance para la barra de carga.
 */
const avanceDescargas: number[] = [0, 0, 0];
const PESOS_MB = [4.1, 0.7, 0.72];
let alAvance: ((p: number) => void) | null = null;
function descargar(url: string, k: number): Promise<ArrayBuffer> {
  return fetch(url).then(async (res) => {
    if (!res.ok || !res.body) throw new Error(`${url}: ${res.status}`);
    const total = Number(res.headers.get("content-length")) || PESOS_MB[k]! * 1e6;
    const lector = res.body.getReader(), partes: Uint8Array[] = [];
    let recibido = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      partes.push(value); recibido += value.length;
      avanceDescargas[k] = Math.min(1, recibido / total);
      alAvance?.(avanceDescargas.reduce((a, v, i) => a + v * PESOS_MB[i]!, 0) / PESOS_MB.reduce((a, b) => a + b, 0));
    }
    const buf = new Uint8Array(recibido);
    let o = 0; for (const p of partes) { buf.set(p, o); o += p.length; }
    return buf.buffer;
  });
}
const descargas = raiz.classList.contains("modo-3d") && webgl()
  ? [descargar(MODELOS.oficina, 0), ...MODELOS.personajes.map((u, i) => descargar(u, i + 1))]
  : null;
descargas?.forEach((d) => d.catch(() => {}));   // el error se informa al usar la descarga
const motor = descargas ? import("./escena/escena.js") : null;   // el código del motor también desde ya

type Estado = "portada" | "oficina" | "servicios" | "proyectos" | "tecnologias" | "nosotros" | "taller" | "contacto";
const SECCIONES: Estado[] = ["servicios", "proyectos", "tecnologias", "nosotros", "taller", "contacto"];
/** Secciones donde el letrero muestra el menú principal (en servicios, proyectos y nosotros muestra su propia lista; en tecnologías se oculta). */
const CON_MENU_PRINCIPAL = new Set<Estado>(["oficina", "taller", "contacto"]);
/** Secciones con lista por id → prefijo de sus atributos: data-<p>-ver, data-<p>-paso y data-vista="<p>-<id>". */
const LISTAS = { servicios: "servicio", nosotros: "nosotros" } as const;
type ConLista = keyof typeof LISTAS;
const CON_LISTA = Object.keys(LISTAS) as ConLista[];
const FLECHAS: Record<string, Estado> = { ArrowLeft: "servicios", ArrowUp: "proyectos", ArrowRight: "nosotros", ArrowDown: "taller" };

/* ---------- Idioma elegido a mano ---------- */
// Se recuerda para que la redirección automática del <head> (según el navegador) no deshaga la elección.
document.addEventListener("click", (ev) => {
  const enlace = (ev.target as Element).closest<HTMLAnchorElement>("[data-idioma]");
  if (enlace) try { localStorage.setItem("idioma", enlace.hreflang); } catch { /* sin almacenamiento: solo esta vez */ }
}, true);

/* ---------- Formulario de contacto ---------- */
/** Hay un formulario en el panel 3D y otro en la vista clásica: se preparan los dos. */
function formularioContacto() {
  $$<HTMLFormElement>("[data-contact-form]").forEach(prepararFormulario);
}
function prepararFormulario(form: HTMLFormElement) {
  const estado = $("[data-form-status]", form)!;
  const boton = $<HTMLButtonElement>("button[type=submit]", form)!;
  const ts = form.elements.namedItem("_ts") as HTMLInputElement;
  const propio = !/^https?:/.test(form.action.replace(location.origin, ""));   // /api/contact (servidor Bun) o servicio externo
  ts.value = String(Date.now());

  const decir = (k: "sending" | "ok" | "error" | "invalid") => {
    estado.textContent = estado.dataset[k] ?? "";
    estado.dataset.state = k;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const campos = $$<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(".field input, .field textarea, .field select", form);
    let malo: HTMLElement | null = null;
    campos.forEach((c) => {
      const ok = c.checkValidity();
      c.setAttribute("aria-invalid", String(!ok));
      if (!ok && !malo) malo = c;
    });
    if (malo) { decir("invalid"); (malo as HTMLElement).focus(); return; }

    const datos = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (!propio) delete datos._ts;               // el tiempo de llenado solo lo valida el servidor propio
    datos.page = location.pathname;
    boton.disabled = true; decir("sending");
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset(); ts.value = String(Date.now()); decir("ok");
    } catch {
      decir("error");
    } finally {
      boton.disabled = false;
    }
  });
}

/** Preselecciona el servicio en el formulario (botones "Cotizar"). */
function servicioEnFormulario(id: string) {
  $$<HTMLSelectElement>("[data-servicio-form]").forEach((sel) => {
    const op = $<HTMLOptionElement>(`option[data-id="${id}"]`, sel);
    if (op) sel.value = op.value;
  });
}

/* ---------- Modo 3D o clásico ---------- */
// La elección se guarda (localStorage "modo") y el <head> la aplica antes de pintar en la próxima carga.
document.addEventListener("click", (ev) => {
  const b = (ev.target as Element).closest<HTMLElement>("[data-cambiar-modo]");
  if (!b) return;
  ev.preventDefault();
  try { localStorage.setItem("modo", b.dataset.cambiarModo!); } catch { /* sin almacenamiento */ }
  location.href = `${location.pathname}?modo=${b.dataset.cambiarModo}${location.hash}`;
});

/* ---------- Oficina 3D ---------- */
function webgl() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

function oficina() {
  const app = $("[data-app]");
  if (!app || !raiz.classList.contains("modo-3d")) return;
  if (!webgl()) { modoDocumento(); return; }

  const ids = (e: ConLista) => $$(`[data-${LISTAS[e]}-ver]`, app).map((a) => a.getAttribute(`data-${LISTAS[e]}-ver`)!);
  const listas = { servicios: ids("servicios"), nosotros: ids("nosotros") };
  const s = {
    estado: "portada" as Estado, llegado: "portada" as Estado | null, hover: null as string | null, proyecto: 0, listo: false,
    sel: { servicios: listas.servicios[0] ?? "", nosotros: listas.nosotros[0] ?? "" } as Record<ConLista, string>,
  };
  const totalProyectos = $$("[data-proyecto-ver]", app).length || 1;
  const hudTag = $("[data-hud-tag]", app);
  const entrar = $("[data-entrar]", app);
  const modal = $("[data-modal-mapa]", app);
  entrar?.setAttribute("aria-disabled", "true");
  let ctrl: any = null;
  const enPantalla: Record<"central" | "izquierda", string | null> = { central: null, izquierda: null };

  const vista = (nombre: string, on: boolean) => $$(`[data-vista="${nombre}"]`, app).forEach((el) => el.classList.toggle("is-on", on));
  const actual = (el: Element, on: boolean) => (on ? el.setAttribute("aria-current", "true") : el.removeAttribute("aria-current"));

  function aplicar() {
    const e = s.estado;
    const panel = (id: Estado) => s.listo && e === id && s.llegado === id;
    vista("portada", e === "portada");
    vista("menu-principal", s.listo && CON_MENU_PRINCIPAL.has(e));
    vista("menu-proyectos", s.listo && e === "proyectos");
    vista("pad", s.listo && e !== "portada");
    vista("pista", s.listo && e === "oficina" && s.llegado === "oficina");
    SECCIONES.forEach((id) => vista(id, panel(id)));
    CON_LISTA.forEach((l) => {
      const p = LISTAS[l];
      vista(`menu-${l}`, s.listo && e === l);
      $$(`[data-${p}-ver]`, app).forEach((a) => {
        const id = a.getAttribute(`data-${p}-ver`)!;
        actual(a, id === s.sel[l]);
        vista(`${p}-${id}`, id === s.sel[l]);
      });
    });
    $$<HTMLElement>("[data-proyecto-ver]", app).forEach((a) => {
      const k = Number(a.dataset.proyectoVer);
      actual(a, k === s.proyecto);
      vista(`proyecto-${k}`, k === s.proyecto);
    });
    $$<HTMLElement>("[data-item]", app).forEach((a) => actual(a, a.dataset.item === e));
    $$<HTMLElement>("[data-pad=izq], [data-pad=der]", app).forEach((b) =>
      b.setAttribute("aria-label", b.getAttribute(`data-aria-${e}`) ?? b.dataset.ariaNormal ?? ""));
    marcarHover();
    actualizarPantalla();
  }

  function marcarHover() {
    $$<HTMLElement>("[data-item]", app).forEach((a) => a.classList.toggle("encima", s.hover === a.dataset.item && s.estado !== a.dataset.item));
    if (hudTag && s.hover) {
      const nombre = $(`[data-item="${s.hover}"] .item-ico + span`, app)?.textContent || s.hover;   // el primer span es el ícono
      hudTag.textContent = `${nombre}  ·  ${hudTag.dataset.abrir ?? ""}`;
    }
  }

  /** Pantallas: el video o la imagen de cada proyecto en la central y la animación de cada servicio en la izquierda
   *  (campos "video" o "imagen" en src/i18n/es.json). */
  function actualizarPantalla() {
    if (!ctrl) return;
    const quiero = {
      central: s.estado === "proyectos" && s.llegado === "proyectos" ? $<HTMLElement>(`[data-vista="proyecto-${s.proyecto}"]`, app)?.dataset.pantalla ?? null : null,
      izquierda: s.estado === "servicios" && s.llegado === "servicios" ? $<HTMLElement>(`[data-vista="servicio-${s.sel.servicios}"]`, app)?.dataset.pantalla ?? null : null,
    };
    for (const cual of ["central", "izquierda"] as const) {
      if (quiero[cual] !== enPantalla[cual]) { ctrl.mostrarEnPantalla(quiero[cual], cual); enPantalla[cual] = quiero[cual]; }
    }
  }

  function ir(e: Estado) {
    if (!s.listo || e === s.estado) return;
    ctrl?.ir(e);
    s.estado = e; s.llegado = null;
    aplicar();
  }
  /* Ventana del mapa 3D (clic en la pantalla del mapamundi). El motor se crea la primera vez que se abre. */
  let crearMapa: ((c: HTMLCanvasElement) => { iniciar(): void; detener(): void; destruir(): void }) | null = null;
  let mapa3d: ReturnType<NonNullable<typeof crearMapa>> | null = null;
  const mapaAbierto = () => !!modal && !modal.hidden;
  let focoPrevio: Element | null = null;
  function abrirMapa() {
    if (!modal || !crearMapa || mapaAbierto()) return;
    focoPrevio = document.activeElement;
    modal.hidden = false;
    mapa3d ??= crearMapa($<HTMLCanvasElement>("[data-mapa-canvas]", modal)!);
    mapa3d.iniciar();
    ctrl?.pausar(true);   // la ventana tapa la oficina: no hace falta dibujarla
    $<HTMLElement>("[data-cerrar-mapa]", modal)?.focus();
  }
  function cerrarMapa() {
    if (!mapaAbierto()) return;
    modal!.hidden = true;
    mapa3d?.detener();
    ctrl?.pausar(false);
    (focoPrevio as HTMLElement | null)?.focus?.();
  }
  modal?.addEventListener("click", (ev) => {
    if (ev.target === modal || (ev.target as Element).closest("[data-cerrar-mapa]")) cerrarMapa();
  });

  const pasoProyecto = (d: number) => { s.proyecto = (s.proyecto + d + totalProyectos) % totalProyectos; aplicar(); };
  const pasoLista = (l: ConLista, d: number) => {
    const lista = listas[l], n = lista.length || 1;
    s.sel[l] = lista[(lista.indexOf(s.sel[l]) + d + n) % n] ?? s.sel[l];
    aplicar();
  };
  /** ← → recorren la lista propia de la sección (servicios, proyectos o nosotros); false si la sección no tiene lista. */
  const paso = (d: number) => {
    if (s.estado === "proyectos") pasoProyecto(d);
    else if (s.estado in LISTAS) pasoLista(s.estado as ConLista, d);
    else return false;
    return true;
  };
  const selector = ["[data-ir]", "[data-abrir-mapa]", "[data-proyecto-ver]", "[data-proyecto-paso]", "[data-pad]", "[data-sin-3d]",
    ...CON_LISTA.flatMap((l) => [`[data-${LISTAS[l]}-ver]`, `[data-${LISTAS[l]}-paso]`])].join(", ");

  // Cambio de idioma: se abre la misma sección en el otro idioma (/#proyectos → /en/#proyectos)
  app.addEventListener("click", (ev) => {
    const enlace = (ev.target as Element).closest<HTMLAnchorElement>("[data-idioma]");
    if (enlace && SECCIONES.includes(s.estado)) { ev.preventDefault(); location.href = `${enlace.href.split("#")[0]}#${s.estado}`; }
  });

  // Clics en menús, botones y enlaces de la app (los enlaces llevan href para el modo documento)
  app.addEventListener("click", (ev) => {
    const el = (ev.target as Element).closest<HTMLElement>(selector);
    if (!el || !raiz.classList.contains("modo-3d")) return;
    ev.preventDefault();
    const d = el.dataset;
    const l = CON_LISTA.find((l) => el.hasAttribute(`data-${LISTAS[l]}-ver`) || el.hasAttribute(`data-${LISTAS[l]}-paso`));
    if (d.sin3d !== undefined) { modoDocumento(); return; }
    if (d.abrirMapa !== undefined) { abrirMapa(); return; }
    if (d.cotizar) servicioEnFormulario(d.cotizar);
    if (d.ir) ir(d.ir as Estado);
    else if (l) {
      const ver = el.getAttribute(`data-${LISTAS[l]}-ver`);
      if (ver) { s.sel[l] = ver; aplicar(); }
      else pasoLista(l, Number(el.getAttribute(`data-${LISTAS[l]}-paso`)));
    }
    else if (d.proyectoVer) { s.proyecto = Number(d.proyectoVer); aplicar(); }
    else if (d.proyectoPaso) pasoProyecto(Number(d.proyectoPaso));
    else if (d.pad === "arriba") ir("proyectos");
    else if (d.pad === "abajo") ir("taller");
    else if (d.pad === "izq") paso(-1) || ir("servicios");
    else if (d.pad === "der") paso(1) || ir("nosotros");
  });

  // Teclado: ← servicios · ↑ proyectos · → nosotros · ↓ taller · Ctrl/⌘ tecnologías · Espacio contacto · X ubicación
  // · Esc vista general (en servicios, proyectos y nosotros ← → recorren su lista)
  const escribiendo = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]");
  const esModificador = (k: string) => k === "Control" || k === "Meta";
  let soloModificador = false;   // Ctrl/⌘ se pulsó y soltó sin otra tecla (así Ctrl+C, Ctrl+R, etc. siguen funcionando)
  document.addEventListener("keyup", (ev) => {
    if (!esModificador(ev.key) || !soloModificador) return;
    soloModificador = false;
    if (s.listo && raiz.classList.contains("modo-3d") && !mapaAbierto() && !escribiendo(ev.target)) ir("tecnologias");
  });
  document.addEventListener("pointerdown", () => { soloModificador = false; });
  window.addEventListener("blur", () => { soloModificador = false; });
  document.addEventListener("keydown", (ev) => {
    if (esModificador(ev.key)) { if (!ev.repeat) soloModificador = true; return; }
    soloModificador = false;
    if (!s.listo || !raiz.classList.contains("modo-3d")) return;
    const t = ev.target as HTMLElement;
    if (escribiendo(t)) return;
    if ((ev.key === "Enter" || ev.key === " ") && t.closest("a, button")) return;
    const k = ev.key, e = s.estado;
    const x = k.toLowerCase() === "x" && !ev.ctrlKey && !ev.metaKey && !ev.altKey;
    if (mapaAbierto()) {
      if (k === "Escape" || x) { ev.preventDefault(); cerrarMapa(); }
      else if (k === "Tab") { ev.preventDefault(); $<HTMLElement>("[data-cerrar-mapa]", modal!)?.focus(); }   // el foco no sale de la ventana
      return;
    }
    if (x) { ev.preventDefault(); abrirMapa(); return; }
    if (e === "portada") {
      if (k === "Enter") { ev.preventDefault(); ir("oficina"); }   // solo Enter (o los botones) inicia el recorrido
      return;
    }
    if ((k === "ArrowLeft" || k === "ArrowRight") && paso(k === "ArrowLeft" ? -1 : 1)) { ev.preventDefault(); return; }
    if (k === " " && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); ir("contacto"); return; }
    if (FLECHAS[k]) { ev.preventDefault(); ir(FLECHAS[k]); }
    else if (k === "Escape") { ev.preventDefault(); ir(e === "oficina" ? "portada" : "oficina"); }
  });

  // Rueda del mouse y deslizar en pantallas táctiles: entrar / salir de la oficina
  let ultimo = 0;
  const mover = (dir: number) => {
    const ahora = performance.now();
    if (ahora - ultimo < 1100) return;
    ultimo = ahora;
    const e = s.estado;
    if (e === "portada") return;   // desde la portada se entra solo con Enter o con los botones
    if (dir < 0 && e === "oficina") ir("portada");
    else if (e !== "portada") ir("oficina");
  };
  const enPanel = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("[data-scroll]");
  app.addEventListener("wheel", (ev) => { if (!enPanel(ev.target) && Math.abs(ev.deltaY) >= 8) mover(Math.sign(ev.deltaY)); }, { passive: true });
  let toqueY: number | null = null;
  app.addEventListener("touchstart", (ev) => { toqueY = ev.touches[0]?.clientY ?? null; }, { passive: true });
  app.addEventListener("touchend", (ev) => {
    const p = ev.changedTouches[0];
    if (toqueY === null || !p || enPanel(ev.target)) { toqueY = null; return; }
    const dy = toqueY - p.clientY; toqueY = null;
    if (Math.abs(dy) > 60) mover(Math.sign(dy));
  }, { passive: true });

  // Carga del motor 3D
  const pct = $("[data-carga-pct]", app), barra = $("[data-carga-barra]", app);
  // Descarga: 0–75 % de la barra; preparar la escena: el último 25 %. Compilar los materiales no informa avance,
  // así que la barra sigue subiendo despacio hacia un techo un poco más allá del avance real en vez de quedarse quieta.
  let real = 0, mostrado = 0;
  const pintarAvance = (v: number) => {
    if (pct) pct.textContent = `${v}%`;
    if (barra) barra.style.width = `${v}%`;
  };
  const relojCarga = setInterval(() => {
    const atrasado = real - mostrado > 0.005;
    const meta = atrasado ? real : real + (0.99 - real) * 0.5;
    mostrado += (meta - mostrado) * (atrasado ? 0.3 : 0.015);
    pintarAvance(Math.min(99, Math.floor(mostrado * 100)));
  }, 100);
  const mostrarAvance = (p: number) => { real = Math.max(real, p); };
  const errorCarga = () => { clearInterval(relojCarga); $("[data-carga-error]", app)?.removeAttribute("hidden"); if (pct) pct.textContent = ""; };
  alAvance = (p) => mostrarAvance(p * 0.75);
  (motor ?? import("./escena/escena.js")).then(({ crear, crearMapaColombia }) => {
    crearMapa = crearMapaColombia;
    ctrl = crear({
      canvas: $("[data-escena]", app), hud: $("[data-hud]", app), modelos: MODELOS, draco: "/draco/", archivos: descargas,
      alProgreso: (p: number) => mostrarAvance(0.75 + p * 0.25),
      alListo: () => {
        clearInterval(relojCarga);
        pintarAvance(100);
        s.listo = true;
        app.classList.add("listo");
        entrar?.removeAttribute("aria-disabled");
        aplicar();
        const destino = location.hash.slice(1) as Estado;   // /#contacto abre directamente esa sección
        if (SECCIONES.includes(destino)) ir(destino);
      },
      alHover: (id: string | null) => { s.hover = id; marcarHover(); },
      alSeleccionar: (id: Estado | "mapa") => (id === "mapa" ? abrirMapa() : ir(id)),
      alLlegar: (e: Estado) => { s.llegado = e; aplicar(); },
      alError: errorCarga,
    });
    (window as any).jh = { ctrl, ir, estado: () => s };   // útil para depurar desde la consola
  }).catch((e) => { console.error(e); errorCarga(); });

  function modoDocumento() {
    raiz.classList.remove("modo-3d");
    raiz.classList.add("sin-3d");
    cerrarMapa(); mapa3d?.destruir(); mapa3d = null;
    ctrl?.destruir(); ctrl = null;
    vistaClasica();
    scrollTo(0, 0);
  }
  aplicar();
}

/** Sin WebGL (o si el usuario lo pide): la home se muestra como documento. */
function modoDocumento() {
  raiz.classList.remove("modo-3d");
  raiz.classList.add("sin-3d");
  vistaClasica();
}

/* ---------- Vista clásica ---------- */
function vistaClasica() {
  const raizCl = $(".clasica");
  if (!raizCl || raiz.classList.contains("modo-3d")) return;
  if (!webgl()) raiz.classList.add("sin-webgl");   // sin WebGL no se ofrece "Ver en 3D"
  // Aparición al hacer scroll
  const revelar = new IntersectionObserver((entradas) => entradas.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visible"); revelar.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  $$(".revelar", raizCl).forEach((el) => revelar.observe(el));
  // Videos de servicios y proyectos: se descargan y reproducen solo mientras se ven
  const videos = new IntersectionObserver((entradas) => entradas.forEach((e) => {
    const v = e.target as HTMLVideoElement;
    if (e.isIntersecting) {
      if (!v.src) { v.src = v.dataset.src!; v.addEventListener("playing", () => v.classList.add("en-curso"), { once: true }); }
      v.play().catch(() => {});
    } else v.pause();
  }), { threshold: 0.35 });
  $$<HTMLVideoElement>("video[data-src]", raizCl).forEach((v) => videos.observe(v));
  // "Cotizar" y "Quiero algo así": preseleccionan el servicio; el menú del celular se cierra al elegir
  raizCl.addEventListener("click", (ev) => {
    const el = (ev.target as Element).closest<HTMLElement>("[data-cotizar], .cl-menu-lista a");
    if (!el) return;
    if (el.dataset.cotizar) servicioEnFormulario(el.dataset.cotizar);
    $<HTMLDetailsElement>(".cl-menu", raizCl)?.removeAttribute("open");
  });
}

formularioContacto();
vistaClasica();
oficina();
