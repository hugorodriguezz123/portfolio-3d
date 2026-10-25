// Motor 3D de la pagina JHS Software Solutions: oficina, camara por estados, personajes que caminan
// esquivando muebles y deteccion de objetos seleccionables (pantallas, escritorio, estante, taller, mesa, mapa).
// main.ts lo importa de forma diferida: la pagina se pinta antes de descargar three.js y los modelos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GRID } from './grid.js';
export { crearMapaColombia } from './mapa-colombia.js';   // ventana del mapa 3D (la abre main.ts)

// Coordenadas de Blender (x, y, z) -> three.js (x, z, -y). Todas las medidas de abajo estan en metros de Blender.
const V = (x, y, z = 0) => new THREE.Vector3(x, z, -y);
const LIGHT_SCALE = 0.35 / 683;
const TRAMO_FINAL = 4.5;      // si un personaje y su punto de llegada estan fuera de cuadro, "salta" hasta quedar a esta distancia del destino
const PRISA = 2.2;            // fuera de cuadro camina mas rapido (cuando no puede saltar sin que se vea)
const ASPECTO_REF = 16 / 9;   // los fov de abajo son verticales para pantallas 16:9

// cam = posicion de la camara, mira = punto al que mira, spots = donde se paran los personajes,
// cara = punto hacia el que miran al llegar, encuadre = desplazamiento de la imagen [x, y] (fraccion de pantalla)
export const ESTADOS = {
  portada:  { cam: [-6.3, 0.95, 1.62], mira: [-12, 1.0, 2.05], fov: 46, spots: [[-10.15, 0.4], [-10.15, 1.5]], cara: [-14, 0.95], encuadre: [-0.15, 0] },
  oficina:  { cam: [-1.4, -1.4, 2.6], mira: [-1.4, 7.9, 1.95], fov: 52, spots: [[-2.35, 5.25], [-1.05, 5.3]], cara: [-1.7, 12], encuadre: [-0.06, 0] },
  // pantalla izquierda
  servicios:   { cam: [-5.1, 0.7, 2.75], mira: [-5.9, 7.9, 2.25], fov: 50, spots: [[-6.55, 5.2], [-5.25, 5.25]], cara: [-5.9, 12], panel: true },
  // pantalla central (aqui iran los videos de los proyectos)
  proyectos:   { cam: [0.6, 0.3, 2.8], mira: [0.2, 7.9, 2.2], fov: 50, spots: [[-0.55, 5.2], [0.75, 5.25]], cara: [0.1, 12], panel: true },
  // escritorio de monitores (sin menu a la izquierda: la escena se corre menos)
  tecnologias: { cam: [-4.0, 1.8, 3.0], mira: [-5.2, 7.4, 0.95], fov: 50, spots: [[-6.05, 5.45], [-4.55, 5.5]], cara: [-5.2, 8.5], panel: true, panelOx: 0.14 },
  // estante y sala
  nosotros:    { cam: [1.9, 0.9, 2.45], mira: [5.5, 7.4, 1.55], fov: 52, spots: [[4.75, 6.45], [5.95, 6.5]], cara: [5.5, 12], panel: true },
  // taller de herramientas e impresora 3D
  taller:      { cam: [6.6, -7.6, 2.2], mira: [11.2, -4.6, 1.4], fov: 52, spots: [[9.6, -6.75], [10.3, -6.1]], cara: [11.6, -4.6], panel: true },
  // mesa principal: los personajes esperan al otro lado, mirando a la camara
  contacto:    { cam: [-1.0, -1.7, 2.35], mira: [-1.25, 3.2, 0.85], fov: 50, spots: [[-1.8, 5.0], [-0.5, 5.05]], cara: [-1.1, -4], panel: true },
};

// Cajas de seleccion [xmin, ymin, zmin, xmax, ymax, zmax] por seccion. 'mapa' (pantalla del mapamundi) no es una seccion: main.ts abre la ventana del mapa 3D.
const SELECCIONABLES = [
  { id: 'servicios', cajas: [[-8.7, 7.7, 1.3, -3.1, 7.98, 4.45]] },
  { id: 'proyectos', cajas: [[-2.95, 7.7, 1.4, 3.35, 7.98, 3.6]] },
  { id: 'tecnologias', cajas: [[-8.85, 6.8, 0.0, -0.25, 7.9, 1.45]] },
  { id: 'nosotros', cajas: [[3.85, 7.35, 0.0, 7.35, 8.0, 4.95], [3.1, 1.4, 0.0, 7.25, 5.5, 1.6]] },
  { id: 'taller', cajas: [[10.7, -7.6, 0.0, 12.0, -1.1, 3.6]] },
  { id: 'contacto', cajas: [[-4.65, 1.45, 0.0, 1.7, 3.55, 0.92]] },
  { id: 'mapa', cajas: [[-1.26, 7.85, 4.19, 1.66, 7.98, 5.71]] },
];
const ESTADOS_CON_SELECCION = new Set(['oficina', 'servicios', 'proyectos', 'tecnologias', 'nosotros', 'taller', 'contacto']);

// ---------- mapa del piso y busqueda de caminos (A*) ----------
// bloq: obstaculos ensanchados una celda (por donde no puede pasar el centro del cuerpo).
// cerca: dos celdas mas de margen; cuesta mas caminar por ahi, asi las rutas van por el centro de los pasillos,
// y los atajos de la ruta suavizada solo se toman si respetan ese margen (hombros y brazos no rozan muebles).
// ruta(desde, hasta, evitar) acepta un obstaculo temporal { x, y, r } para rodear al otro personaje.
function crearMapa() {
  const { w, h, x0, y1, paso, filas } = GRID;
  const N = w * h;
  const occ = new Uint8Array(N);
  filas.forEach((hex, j) => {
    for (let k = 0; k < hex.length; k++) {
      const n = parseInt(hex[k], 16);
      for (let b = 0; b < 4; b++) if (n & (8 >> b)) occ[j * w + k * 4 + b] = 1;
    }
  });
  const ensanchar = (origen, r) => {
    const out = new Uint8Array(N);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!origen[j * w + i]) continue;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const a = i + di, b = j + dj;
        if (a >= 0 && a < w && b >= 0 && b < h && di * di + dj * dj <= r * r + 1) out[b * w + a] = 1;
      }
    }
    return out;
  };
  const bloq = ensanchar(occ, 1), cerca = ensanchar(occ, 3);
  const temp = new Uint8Array(N);   // obstaculo temporal de la busqueda actual
  const gs = new Float32Array(N), de = new Int32Array(N), cerrado = new Uint8Array(N);
  const celda = (x, y) => [Math.min(w - 1, Math.max(0, Math.floor((x - x0) / paso))), Math.min(h - 1, Math.max(0, Math.floor((y1 - y) / paso)))];
  const centro = (i, j) => [x0 + (i + 0.5) * paso, y1 - (j + 0.5) * paso];
  const dentro = (i, j) => i >= 0 && j >= 0 && i < w && j < h;
  const libre = (i, j) => dentro(i, j) && !bloq[j * w + i] && !temp[j * w + i];
  const holgado = (i, j) => libre(i, j) && !cerca[j * w + i];
  function cercanaLibre(i, j) {
    for (let r = 1; r < 15; r++) {
      let mejor = null, md = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !libre(i + di, j + dj)) continue;
        const d = di * di + dj * dj; if (d < md) { md = d; mejor = [i + di, j + dj]; }
      }
      if (mejor) return mejor;
    }
    return [i, j];
  }
  function vista(a, b, prueba) {
    const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2) || 1;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (!prueba(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t))) return false;
    }
    return true;
  }
  function ruta(desde, hasta, evitar = null) {
    temp.fill(0);
    if (evitar) {
      const [ci, cj] = celda(evitar.x, evitar.y), r = Math.ceil(evitar.r / paso);
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (di * di + dj * dj <= r * r && dentro(ci + di, cj + dj)) temp[(cj + dj) * w + ci + di] = 1;
    }
    let s = celda(desde[0], desde[1]), g = celda(hasta[0], hasta[1]);
    if (!libre(s[0], s[1])) s = cercanaLibre(s[0], s[1]);
    if (!libre(g[0], g[1])) g = cercanaLibre(g[0], g[1]);
    gs.fill(Infinity); de.fill(-1); cerrado.fill(0);
    const heap = [];   // [f, idx]
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const hfn = (i, j) => { const dx = Math.abs(i - g[0]), dy = Math.abs(j - g[1]); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
    const si = s[1] * w + s[0], gi = g[1] * w + g[0];
    gs[si] = 0; push(hfn(s[0], s[1]), si);
    while (heap.length) {
      const [, cur] = pop();
      if (cerrado[cur]) continue;
      if (cur === gi) break;
      cerrado[cur] = 1;
      const ci = cur % w, cj = (cur / w) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!libre(ni, nj)) continue;
        if (di && dj && (!libre(ci + di, cj) || !libre(ci, cj + dj))) continue;   // sin cortar esquinas
        const n = nj * w + ni, ng = gs[cur] + (di && dj ? 1.4142 : 1) + (cerca[n] ? 0.6 : 0);
        if (ng < gs[n]) { gs[n] = ng; de[n] = cur; push(ng + hfn(ni, nj), n); }
      }
    }
    if (de[gi] === -1 && gi !== si) return [desde.slice(), hasta.slice()];
    const celdas = [];
    for (let c = gi; c !== -1; c = de[c]) celdas.push([c % w, (c / w) | 0]);
    celdas.reverse();
    // Suavizado: se une cada esquina con la mas lejana que se vea con holgura (si no, con el minimo de margen)
    const esquinas = [celdas[0]];
    let ancla = 0;
    for (let k = 2; k < celdas.length; k++) {
      const prueba = holgado(...celdas[ancla]) && holgado(...celdas[k]) ? holgado : libre;
      if (!vista(celdas[ancla], celdas[k], prueba)) { esquinas.push(celdas[k - 1]); ancla = k - 1; }
    }
    esquinas.push(celdas[celdas.length - 1]);
    const pts = esquinas.map(([i, j]) => centro(i, j));
    pts[0] = desde.slice(); pts[pts.length - 1] = hasta.slice();
    return pts;
  }
  return { ruta };
}

// ---------- personajes ----------
function sombraSuave() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.72)'); grad.addColorStop(0.5, 'rgba(0,0,0,0.34)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = 2;
  return m;
}
const yawHacia = (dx, dy) => Math.atan2(dx, -dy);   // direccion en ejes de Blender -> rotation.y de three.js
const angDif = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

class Personaje {
  constructor(gltf, cfg) {
    this.raiz = gltf.scene;
    this.raiz.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; });
    this.raiz.add(sombraSuave());
    this.mixer = new THREE.AnimationMixer(this.raiz);
    const clips = gltf.animations;
    const clipCaminar = clips.find((c) => /caminar/i.test(c.name)) || clips[0];
    const clipParado = clips.find((c) => /parado/i.test(c.name));
    this.caminar = this.mixer.clipAction(clipCaminar); this.caminar.timeScale = cfg.ritmo; this.caminar.play();
    this.parado = clipParado ? this.mixer.clipAction(clipParado) : null;
    if (this.parado) { this.parado.play(); this.parado.time = Math.random() * clipParado.duration; }
    this.velocidad = cfg.zancada / clipCaminar.duration * cfg.ritmo;
    this.peso = 0;
    this.x = 0; this.y = 0; this.yaw = 0; this.yawObjetivo = 0;
    this.ruta = null; this.espera = 0; this.cara = null; this.destino = null;
    this.avance = 1; this.frenar = false; this.bloqueado = 0;   // frenado suave cuando el otro personaje esta delante
    this.rodeo = false;   // sigue una ruta que ya rodea al otro: solo frena si el contacto es inminente
    this.prisaOk = true;  // puede apurarse fuera de cuadro (solo si el otro esta lejos: si no, no alcanzaria a frenar)
    this._esfera = new THREE.Sphere(new THREE.Vector3(), 0.75);
  }
  colocar(x, y, cara) {
    this.x = x; this.y = y; this.ruta = null; this.cara = cara;
    this.yaw = this.yawObjetivo = yawHacia(cara[0] - x, cara[1] - y);
    this.peso = 0; this._aplicar();
  }
  irA(pts, cara, espera) {
    const acum = [0];
    for (let k = 1; k < pts.length; k++) acum.push(acum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    this.ruta = { pts, acum, total: acum[acum.length - 1], s: 0 };
    this.cara = cara; this.espera = espera; this.destino = pts[pts.length - 1];
    if (this.ruta.total < 0.05) this.ruta = null;
  }
  _punto(s) {
    const r = this.ruta; s = Math.min(Math.max(s, 0), r.total);
    let k = 1; while (k < r.acum.length - 1 && r.acum[k] < s) k++;
    const a = r.pts[k - 1], b = r.pts[k], L = r.acum[k] - r.acum[k - 1] || 1, t = (s - r.acum[k - 1]) / L;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  /** Direccion en la que camina ahora (vector unitario en el plano), o [0, 0] si esta quieto. */
  rumbo() {
    if (!this.ruta) return [0, 0];
    const a = this._punto(this.ruta.s), b = this._punto(this.ruta.s + 0.5), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return d > 1e-3 ? [(b[0] - a[0]) / d, (b[1] - a[1]) / d] : [0, 0];
  }
  visible(frustum, x = this.x, y = this.y, margen = 0.75) { this._esfera.center.set(x, 0.9, -y); this._esfera.radius = margen; return frustum.intersectsSphere(this._esfera); }
  update(dt, frustum, libreEn = null, camaraQuieta = true) {
    const r = this.ruta;
    let caminando = false;
    if (r) {
      if (this.espera > 0) this.espera -= dt;
      else {
        this.avance += ((this.frenar ? 0 : 1) - this.avance) * Math.min(1, dt * 8);
        caminando = this.avance > 0.15;
        // Fuera de cuadro: salta solo si tambien el punto de llegada queda fuera (no aparece de golpe) y libre del otro;
        // si no puede saltar, camina mas rapido hasta volver a verse
        const fuera = !this.visible(frustum);
        let salto = false;
        if (fuera && camaraQuieta && !this.frenar && r.total - r.s > TRAMO_FINAL + 1.5) {
          const [lx, ly] = this._punto(r.total - TRAMO_FINAL), [mx, my] = this._punto(r.total - TRAMO_FINAL + 1);
          if (!this.visible(frustum, lx, ly, 1.3) && !this.visible(frustum, mx, my, 1.3) && (!libreEn || libreEn(this, lx, ly))) { r.s = r.total - TRAMO_FINAL; salto = true; this.saltos = (this.saltos || 0) + 1; }
        }
        r.s += this.velocidad * dt * Math.min(1, 0.35 + this.peso) * this.avance * (fuera && this.prisaOk ? PRISA : 1);
        [this.x, this.y] = this._punto(r.s);
        const ade = this._punto(r.s + 0.8);
        if (Math.hypot(ade[0] - this.x, ade[1] - this.y) > 0.05) this.yawObjetivo = yawHacia(ade[0] - this.x, ade[1] - this.y);
        if (salto) this.yaw = this.yawObjetivo;   // nadie lo ve: llega ya orientado, sin girar en el sitio
        if (r.s >= r.total) { this.ruta = null; caminando = false; }
      }
    }
    if (!this.ruta && this.cara) this.yawObjetivo = yawHacia(this.cara[0] - this.x, this.cara[1] - this.y);
    const d = angDif(this.yaw, this.yawObjetivo), giro = (caminando ? 4.5 : 3.0) * dt;
    this.yaw += Math.abs(d) < giro ? d : Math.sign(d) * giro;
    this.peso += ((caminando ? 1 : 0) - this.peso) * Math.min(1, dt * 5);
    this.caminar.setEffectiveWeight(this.peso);
    if (this.parado) this.parado.setEffectiveWeight(1 - this.peso);
    this.mixer.update(dt);
    this._aplicar();
  }
  _aplicar() { this.raiz.position.set(this.x, 0, -this.y); this.raiz.rotation.y = this.yaw; }
}

// ---------- escena ----------
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function crear(op) {
  const canvas = op.canvas, hud = op.hud || null;
  const avisar = (fn, ...a) => { try { if (op[fn]) op[fn](...a); } catch (e) { console.error(e); } };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  // Resolucion adaptativa: si los cuadros tardan, baja la densidad de pixeles; si van sobrados, la recupera
  const PR_MAX = Math.min(window.devicePixelRatio || 1, 1.5), PR_MIN = Math.min(0.75, PR_MAX);
  let pr = PR_MAX;
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03040a);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex; scene.environmentIntensity = 0.05;
  const camera = new THREE.PerspectiveCamera(46, 1, 0.15, 300);   // near alto = mas precision de profundidad (la camara nunca se acerca a menos de 1 m)
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.16, 0.25, 3.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let ancho = 1, alto = 1;
  function medir() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (w === ancho && h === alto) return;
    ancho = w; alto = h;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
  }
  const ro = new ResizeObserver(medir); ro.observe(canvas); medir();

  // estado de camara (en ejes de three.js)
  const cam = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 46, ox: 0, oy: 0 };
  let trans = null;   // { de, a, t, dur, estado }
  let actual = 'portada', llegado = 'portada';
  const destinoCam = (nombre) => {
    const e = ESTADOS[nombre], movil = ancho < 760;
    let ox = 0, oy = 0;
    if (e.encuadre && !movil) [ox, oy] = e.encuadre;
    if (e.panel) { if (movil) oy = 0.2; else ox = e.panelOx ?? 0.07; }
    return { pos: V(...e.cam), mira: V(...e.mira), fov: e.fov, ox, oy };
  };
  Object.assign(cam, destinoCam('portada'));

  const mapa = crearMapa();
  const personajes = [];
  const frustum = new THREE.Frustum(), _m = new THREE.Matrix4();

  function moverPersonajes(nombre, inmediato) {
    const e = ESTADOS[nombre];
    if (!personajes.length) return;
    // personajes[0] = el de negro, personajes[1] = el de azul. Visto desde la camara de cada zona, el de azul va
    // a la izquierda y el de negro a la derecha, salvo que asi se crucen: entonces cada uno toma el lugar mas cercano.
    const [p, q] = personajes;
    const [cx, cy] = e.cam, [mx, my] = e.mira, der = [my - cy, -(mx - cx)];   // vector "derecha" de la camara
    const lado = (sp) => sp[0] * der[0] + sp[1] * der[1];
    const [izq, dch] = lado(e.spots[0]) <= lado(e.spots[1]) ? e.spots : [e.spots[1], e.spots[0]];
    const d = (a, s) => Math.hypot(a.x - s[0], a.y - s[1]);
    const preferido = d(p, dch) + d(q, izq), otro = d(p, izq) + d(q, dch);
    const asign = inmediato || preferido <= otro + 0.8 ? [[p, dch], [q, izq]] : [[p, izq], [q, dch]];
    asign.forEach(([per, spot], k) => {
      if (inmediato) per.colocar(spot[0], spot[1], e.cara);
      else { per.irA(mapa.ruta([per.x, per.y], spot), e.cara, k * 0.4); per.rodeo = false; }
    });
  }

  // Los personajes no se atraviesan. Quien tiene al otro delante y cerca frena con suavidad (lo sigue o lo deja pasar)
  // y, si sigue bloqueado, recalcula su ruta rodeandolo. Si van de frente, cede el segundo; a uno quieto siempre se le rodea.
  const DIST_CHOQUE = 1.0;
  const delanteDe = (p, o) => {
    if (!p.ruta || p.espera > 0) return false;
    const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1e-3, [rx, ry] = p.rumbo();
    // Lejos cuenta solo lo que esta delante; muy cerca (< 0,7 m) tambien lo que esta de lado, para no rozarse los hombros
    return d < (p.rodeo ? 0.7 : DIST_CHOQUE) && (dx * rx + dy * ry) / d > (d < 0.7 ? -0.15 : 0.2);
  };
  function evitarChoques(dt) {
    if (personajes.length < 2) return;
    const [a, b] = personajes;
    const ve = [delanteDe(a, b), delanteDe(b, a)];
    personajes.forEach((p, k) => {
      const o = personajes[1 - k];
      p.prisaOk = Math.hypot(o.x - p.x, o.y - p.y) > 2.5;
      const otroQuieto = !o.ruta || o.espera > 0;
      // Cede si tiene al otro delante, salvo el primero cuando van de frente y el otro sigue caminando
      const cede = ve[k] && !(k === 0 && ve[1] && !otroQuieto);
      p.frenar = cede;
      if (!cede) { p.bloqueado = Math.min(p.bloqueado, 0); return; }
      p.bloqueado += dt;
      if (p.bloqueado > 0.3 && p.destino) {
        p.irA(mapa.ruta([p.x, p.y], p.destino, { x: o.x, y: o.y, r: 0.8 }), p.cara, 0);
        p.rodeo = true;
        p.bloqueado = -0.7;   // espera un poco antes de volver a recalcular
      }
    });
  }
  // El salto de quien camina fuera de cuadro no puede caer encima del otro
  const lugarLibre = (p, x, y) => personajes.every((o) => o === p || Math.hypot(o.x - x, o.y - y) > 1.0);

  function ir(nombre) {
    if (!ESTADOS[nombre] || nombre === actual) return;
    const a = destinoCam(nombre);
    const dist = cam.pos.distanceTo(a.pos) + 0.5 * cam.mira.distanceTo(a.mira);
    trans = { de: { pos: cam.pos.clone(), mira: cam.mira.clone(), fov: cam.fov, ox: cam.ox, oy: cam.oy }, a, t: 0, dur: Math.min(3.0, Math.max(1.6, 1.2 + dist * 0.09)), estado: nombre };
    actual = nombre; llegado = null;
    moverPersonajes(nombre, false);
    if (!ESTADOS_CON_SELECCION.has(nombre)) fijarHover(null);
  }

  // ---------- seleccion con el puntero ----------
  const cajas = [];
  for (const s of SELECCIONABLES) for (const c of s.cajas) {
    const b = new THREE.Box3(new THREE.Vector3(c[0], c[2], -c[4]), new THREE.Vector3(c[3], c[5], -c[1]));
    cajas.push({ id: s.id, caja: b, grande: b.clone().expandByScalar(0.15) });
  }
  const raycaster = new THREE.Raycaster(), _cruce = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  let punteroDentro = false, punteroMovido = false, ultimoRayo = 0, hoverId = null, hoverCaja = null;
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  // El rayo del puntero se prueba contra las cajas de seleccion (no contra los miles de triangulos de la oficina):
  // gana la caja mas cercana a la camara que el rayo atraviesa.
  function calcularHover() {
    if (!ESTADOS_CON_SELECCION.has(actual) || !punteroDentro) return null;
    raycaster.setFromCamera(ndc, camera);
    let mejor = null, minimo = Infinity;
    for (const c of cajas) {
      if (!raycaster.ray.intersectBox(c.grande, _cruce)) continue;
      const d = _cruce.distanceToSquared(raycaster.ray.origin);
      if (d < minimo) { minimo = d; mejor = c; }
    }
    return mejor;
  }
  function fijarHover(c) {
    const id = c ? c.id : null;
    hoverCaja = c;
    if (id !== hoverId) { hoverId = id; canvas.style.cursor = id ? 'pointer' : ''; avisar('alHover', id); }
  }
  const pos = (ev) => { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top, r]; };
  let abajo = null;
  const onMove = (ev) => {
    const [x, y, r] = pos(ev);
    ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1);
    parallax.tx = ndc.x; parallax.ty = ndc.y;
    punteroDentro = true; punteroMovido = true;
  };
  const onLeave = () => { punteroDentro = false; fijarHover(null); parallax.tx = parallax.ty = 0; };
  const onDown = (ev) => { const [x, y] = pos(ev); abajo = [x, y]; };
  const onUp = (ev) => {
    const [x, y, r] = pos(ev);
    if (!abajo || Math.hypot(x - abajo[0], y - abajo[1]) > 8) { abajo = null; return; }
    abajo = null;
    ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1);
    punteroDentro = true;
    const c = calcularHover();
    fijarHover(c);
    if (c) avisar('alSeleccionar', c.id);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  const _esq = new THREE.Vector3();
  function moverHud() {
    if (!hud) return;
    if (!hoverCaja) { hud.style.opacity = '0'; return; }
    const b = hoverCaja.caja;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      _esq.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).project(camera);
      const sx = (_esq.x * 0.5 + 0.5) * ancho, sy = (-_esq.y * 0.5 + 0.5) * alto;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
    }
    x0 = Math.max(8, x0 - 6); y0 = Math.max(8, y0 - 6); x1 = Math.min(ancho - 8, x1 + 6); y1 = Math.min(alto - 8, y1 + 6);
    hud.style.opacity = '1';
    hud.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`;
    hud.style.width = `${Math.max(0, x1 - x0).toFixed(1)}px`;
    hud.style.height = `${Math.max(0, y1 - y0).toFixed(1)}px`;
  }

  // ---------- carga ----------
  // Modelos .glb comprimidos con Draco. El decodificador se sirve desde el propio sitio (public/draco/).
  const draco = new DRACOLoader().setDecoderPath(op.draco || '/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const pesos = op.pesos || [4.2, 0.71, 0.74], prog = [0, 0, 0];   // MB de cada archivo (solo para la barra)
  const progreso = () => avisar('alProgreso', Math.min(0.99, prog.reduce((s, p, k) => s + p * pesos[k], 0) / pesos.reduce((a, b) => a + b, 0)));
  // Si main.ts ya trae las descargas (op.archivos), solo se decodifican; el decodificador Draco se prepara
  // de inmediato para no esperar al primer modelo
  draco.preload();
  let decodificados = 0;
  const cargar = (url, k) => op.archivos
    ? op.archivos[k].then((buf) => loader.parseAsync(buf, '')).then((g) => { avisar('alProgreso', (++decodificados / 3) * 0.6); return g; })
    : new Promise((res, rej) => loader.load(url,
      (g) => { prog[k] = 1; progreso(); res(g); },
      (e) => { prog[k] = Math.min(0.98, e.loaded / (e.total || pesos[k] * 1e6)); progreso(); },
      rej));
  let vivo = true;
  const pantallas = {};   // pantallas que muestran videos o imagenes: material, malla y textura original
  const PANTALLAS = { M_Screen_Main: 'central', M_Whiteboard: 'izquierda' };
  Promise.all([cargar(op.modelos.oficina, 0), cargar(op.modelos.personajes[0], 1), cargar(op.modelos.personajes[1], 2)]).then(async ([of, p1, p2]) => {
    if (!vivo) return;
    scene.add(of.scene);
    of.scene.traverse((o) => {
      if (o.isLight) o.intensity *= LIGHT_SCALE;
      if (o.isMesh) {
        for (const m of [].concat(o.material)) {
          if (m.name === 'M_Window_Glass') { m.envMap = envTex; m.envMapIntensity = 0.3; m.needsUpdate = true; }
          if (PANTALLAS[m.name]) pantallas[PANTALLAS[m.name]] = { material: m, malla: o, map: m.map, emissiveMap: m.emissiveMap, medio: null };
        }
      }
    });
    const cfgs = [{ zancada: 1.751, ritmo: 1.0 }, { zancada: 1.7709, ritmo: 1.0 }];
    [p1, p2].forEach((g, k) => { const p = new Personaje(g, cfgs[k]); personajes.push(p); scene.add(p.raiz); });
    moverPersonajes(actual, true);
    avisar('alProgreso', 0.7);
    // Compila los ~100 materiales en paralelo (KHR_parallel_shader_compile) sin bloquear la pagina
    await renderer.compileAsync(scene, camera);
    if (!vivo) return;
    avisar('alProgreso', 0.85);
    // Sube todas las texturas a la GPU ahora: si no, se suben la primera vez que entran en cuadro y la camara se traba
    const subidas = new Set();
    scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const v of Object.values(m)) if (v && v.isTexture && !subidas.has(v)) { subidas.add(v); renderer.initTexture(v); } });
    // Calentamiento (detras de la pantalla de carga): un cuadro con toda la oficina, sin descartar lo que esta fuera
    // de camara, sube a la GPU todas las geometrias. Si no, el primer viaje a la vista general las sube de golpe.
    // Se dibuja en un lienzo diminuto y sin posproceso: subir geometria no depende de la resolucion.
    const descartables = [];
    scene.traverse((o) => { if (o.isMesh && o.frustumCulled) { o.frustumCulled = false; descartables.push(o); } });
    const mini = new THREE.WebGLRenderTarget(16, 16);
    renderer.setRenderTarget(mini); renderer.render(scene, camera); renderer.setRenderTarget(null);
    mini.dispose();
    for (const o of descartables) o.frustumCulled = true;
    avisar('alProgreso', 1);
    // La resolucion adaptativa empieza a medir ahora: los cuadros pesados de la carga no cuentan
    msMedio = 16; ultimoCuadro = 0; ultimoAjuste = performance.now();
    preparada = true;
    avisar('alListo');
  }).catch((e) => { console.error(e); avisar('alError', String(e && e.message || e)); });

  // ---------- bucle ----------
  const reloj = new THREE.Clock();
  const derecha = new THREE.Vector3(), arriba = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), _mira = new THREE.Vector3();
  let raf = 0, preparada = false, pausado = false, msMedio = 16, ultimoAjuste = 0, ultimoCuadro = 0, finRecorrido = 0;
  function ajustarResolucion(ahora) {
    if (ultimoCuadro) msMedio += (Math.min(100, ahora - ultimoCuadro) - msMedio) * 0.05;
    ultimoCuadro = ahora;
    if (trans) { finRecorrido = ahora; return; }   // nunca durante un recorrido: cambiar el tamano cuesta un cuadro
    if (ahora - ultimoAjuste < 3000 || ahora - finRecorrido < 2000) return;   // ni justo al llegar
    let nuevo = pr;
    if (msMedio > 26 && pr > PR_MIN) nuevo = Math.max(PR_MIN, pr - 0.25);
    else if (msMedio < 18.5 && pr < PR_MAX && ahora - ultimoAjuste > 8000) nuevo = Math.min(PR_MAX, pr + 0.125);
    if (nuevo === pr) return;
    pr = nuevo; ultimoAjuste = ahora;
    renderer.setPixelRatio(pr); composer.setPixelRatio(pr); composer.setSize(ancho, alto);
  }
  function cuadro() {
    raf = requestAnimationFrame(cuadro);
    // Sin dibujar mientras carga (el lienzo esta oculto: asi la GPU se dedica a preparar la escena)
    // ni con la ventana del mapa abierta (la tapa)
    if (pausado || !preparada) { reloj.getDelta(); ultimoCuadro = 0; return; }
    medir();
    paso(Math.min(reloj.getDelta(), 0.1));
    const ahora = performance.now();
    ajustarResolucion(ahora);
    if (punteroMovido && ahora - ultimoRayo > 70) { ultimoRayo = ahora; punteroMovido = false; fijarHover(calcularHover()); }
    moverHud();
    composer.render();
  }
  function paso(dt) {
    if (trans) {
      trans.t += Math.min(dt, 1 / 30) / trans.dur;   // un cuadro lento no hace saltar la camara
      const k = ease(Math.min(1, trans.t)), de = trans.de, a = trans.a;
      cam.pos.lerpVectors(de.pos, a.pos, k); cam.mira.lerpVectors(de.mira, a.mira, k);
      cam.fov = de.fov + (a.fov - de.fov) * k; cam.ox = de.ox + (a.ox - de.ox) * k; cam.oy = de.oy + (a.oy - de.oy) * k;
      if (trans.t >= 1) { llegado = trans.estado; trans = null; avisar('alLlegar', llegado); }
    }
    // camara: fov constante en horizontal para pantallas angostas, mas un leve paralaje con el puntero
    parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 2.5);
    parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 2.5);
    dir.subVectors(cam.mira, cam.pos).normalize();
    derecha.crossVectors(dir, arriba).normalize();
    camera.position.copy(cam.pos).addScaledVector(derecha, parallax.x * 0.12).addScaledVector(arriba, parallax.y * 0.05);
    _mira.copy(cam.mira).addScaledVector(derecha, parallax.x * 0.35).addScaledVector(arriba, parallax.y * 0.2);
    camera.lookAt(_mira);
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * ASPECTO_REF);
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / camera.aspect);
    camera.fov = Math.min(82, Math.max(cam.fov, THREE.MathUtils.radToDeg(vfov)));
    if (Math.abs(cam.ox) > 1e-4 || Math.abs(cam.oy) > 1e-4) camera.setViewOffset(ancho, alto, cam.ox * ancho, cam.oy * alto, ancho, alto);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    evitarChoques(dt);
    for (const p of personajes) p.update(dt, frustum, lugarLibre, !trans);   // con la camara en viaje no hay saltos: lo que hoy esta fuera de cuadro puede verse un instante despues
  }
  raf = requestAnimationFrame(cuadro);

  // ---------- video o imagen en las pantallas (central: proyectos · izquierda: servicios) ----------
  // mostrarEnPantalla('/videos/x.mp4', 'central') reproduce el video (silenciado, en bucle) y con una imagen
  // ('/images/proyectos/x.webp') la deja fija; ambos se recortan para llenar la pantalla sin deformarse.
  // mostrarEnPantalla(null, cual) vuelve a la imagen original de esa pantalla.
  const encuadrar = (p, tex, w, h) => {
    const caja = new THREE.Box3().setFromObject(p.malla), t = new THREE.Vector3(); caja.getSize(t);
    const aspPantalla = Math.max(t.x, t.z) / Math.max(t.y, 1e-3), asp = w / h;
    tex.repeat.set(1, 1); tex.offset.set(0, 0);
    if (asp > aspPantalla) { tex.repeat.x = aspPantalla / asp; tex.offset.x = (1 - tex.repeat.x) / 2; }
    else { tex.repeat.y = asp / aspPantalla; tex.offset.y = (1 - tex.repeat.y) / 2; }
  };
  function mostrarEnPantalla(url, cual = 'central') {
    const p = pantallas[cual];
    if (!p) return;
    const m = p.material;
    if (p.medio) {
      if (p.medio.el) { p.medio.el.pause(); p.medio.el.removeAttribute('src'); p.medio.el.load(); }
      p.medio.tex.dispose(); p.medio = null;
    }
    if (!url) { m.map = p.map; m.emissiveMap = p.emissiveMap; m.needsUpdate = true; return; }
    let tex;
    if (/\.(webp|png|jpe?g|avif)$/i.test(url)) {
      tex = new THREE.TextureLoader().load(url, (t) => encuadrar(p, t, t.image.width, t.image.height));
      p.medio = { tex };
    } else {
      const el = Object.assign(document.createElement('video'), { src: url, muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous' });
      tex = new THREE.VideoTexture(el);
      el.addEventListener('loadedmetadata', () => encuadrar(p, tex, el.videoWidth, el.videoHeight));
      el.addEventListener('error', () => { if (p.medio && p.medio.el === el) mostrarEnPantalla(null, cual); });   // sin video: imagen original
      el.play().catch(() => {});
      p.medio = { tex, el };
    }
    tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
    m.map = tex; m.emissiveMap = tex; m.needsUpdate = true;
  }

  function destruir() {
    vivo = false;
    for (const cual of Object.keys(pantallas)) mostrarEnPantalla(null, cual);
    draco.dispose();
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) { for (const v of Object.values(m)) if (v && v.isTexture) v.dispose(); m.dispose(); }
    });
    envTex.dispose(); pmrem.dispose(); rt.dispose(); composer.dispose && composer.dispose(); renderer.dispose();
  }
  // simular: avanza el tiempo sin dibujar (util para pruebas automaticas y capturas)
  const simular = (seg) => { for (let t = 0; t < seg; t += 0.05) paso(0.05); };
  const pausar = (v) => { pausado = !!v; };
  const posiciones = () => personajes.map((p) => [p.x, p.y, p.visible(frustum) ? 1 : 0, p.saltos || 0]);   // para pruebas automaticas
  return { ir, destruir, mostrarEnPantalla, pausar, posiciones, estado: () => actual, llegado: () => llegado, simular };
}
