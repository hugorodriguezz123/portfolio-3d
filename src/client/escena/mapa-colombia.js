// Mapa 3D de Colombia con Bucaramanga marcada en ambar. Se muestra en la ventana que se abre al hacer
// clic en la pantalla del mapamundi (encima de las pantallas). Tiene su propio renderer y solo dibuja
// mientras la ventana esta abierta. Se gira arrastrando con el puntero.
import * as THREE from 'three';
import { COLOMBIA } from './colombia.js';

const CIUDAD = { nombre: 'Bucaramanga', region: 'Santander, Colombia', lon: -73.1227, lat: 7.1193 };
const AZUL = 0x4c9dff, AMBAR = 0xf2b45a;
const ALTURA = 0.7;   // grosor del relieve (en grados)

// Proyeccion equirectangular centrada en el pais (1 unidad = 1 grado de latitud)
const LON0 = -73.3, LAT0 = 4.2, KX = Math.cos(THREE.MathUtils.degToRad(LAT0));
const proyectar = (lon, lat) => new THREE.Vector2((lon - LON0) * KX, lat - LAT0);

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Etiqueta de la ciudad (sprite: siempre mira a la camara)
function etiqueta() {
  const tex = lienzo(512, 160, (g) => {
    g.fillStyle = '#f2b45a'; g.font = '700 64px "Outfit", "Manrope", sans-serif';
    g.shadowColor = 'rgba(242,180,90,0.8)'; g.shadowBlur = 18;
    g.fillText(CIUDAD.nombre, 8, 74);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,214,160,0.9)'; g.font = '400 34px "JetBrains Mono", monospace';
    g.fillText(CIUDAD.region, 10, 128);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.center.set(0, 0.5); s.scale.set(5.2, 1.625, 1); s.renderOrder = 5;
  return s;
}

export function crearMapaColombia(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 1, 200);
  camara.up.set(0, 0, 1);
  camara.position.set(0, -19.5, 15.5); camara.lookAt(0, -0.6, 0);

  escena.add(new THREE.AmbientLight(0xbcd8ff, 0.9));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(-8, -10, 16); escena.add(sol);

  // Pais en relieve: tapa con puntos que brillan, lados oscuros y borde neon
  const contorno = COLOMBIA.map(([lon, lat]) => proyectar(lon, lat));
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(contorno), { depth: ALTURA, bevelEnabled: false });
  const puntos = lienzo(32, 32, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#fff'; g.fillRect(14, 14, 5, 5); });
  puntos.wrapS = puntos.wrapT = THREE.RepeatWrapping; puntos.repeat.set(2.5, 2.5);
  const tapa = new THREE.MeshStandardMaterial({ color: 0x0d2c63, roughness: 0.7, emissive: AZUL, emissiveMap: puntos, emissiveIntensity: 0.9 });
  const lados = new THREE.MeshStandardMaterial({ color: 0x07173a, roughness: 0.8, emissive: 0x0a2a6a, emissiveIntensity: 0.35 });
  const pais = new THREE.Group();
  pais.add(new THREE.Mesh(geo, [tapa, lados]));
  const linea = (z, mat) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(contorno.map((p) => new THREE.Vector3(p.x, p.y, z))), mat);
  pais.add(linea(ALTURA + 0.01, new THREE.LineBasicMaterial({ color: 0x9fd0ff })));
  pais.add(linea(0, new THREE.LineBasicMaterial({ color: AZUL, transparent: true, opacity: 0.45 })));

  // Bucaramanga: aro que late sobre el relieve, columna y punto ambar, y la etiqueta
  const c = proyectar(CIUDAD.lon, CIUDAD.lat);
  const ambar = new THREE.MeshBasicMaterial({ color: AMBAR });
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12), ambar);
  columna.rotation.x = Math.PI / 2; columna.position.set(c.x, c.y, ALTURA + 1.1);
  const punto = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), ambar);
  punto.position.set(c.x, c.y, ALTURA + 2.3);
  const aroMat = new THREE.MeshBasicMaterial({ color: AMBAR, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.6, 40), aroMat);
  aro.position.set(c.x, c.y, ALTURA + 0.03);
  const nombre = etiqueta(); nombre.position.set(c.x + 0.6, c.y, ALTURA + 2.6);
  pais.add(columna, punto, aro, nombre);

  // El pais gira sobre su propio centro
  const centro = new THREE.Box3().setFromObject(pais).getCenter(new THREE.Vector3());
  pais.position.set(-centro.x, -centro.y, 0);
  const giro = new THREE.Group(); giro.add(pais); escena.add(giro);

  // Arrastrar gira el mapa; al soltar vuelve a balancearse solo
  let arrastre = null, angulo = 0, manual = 0;
  const onDown = (ev) => { arrastre = ev.clientX; canvas.setPointerCapture(ev.pointerId); };
  const onMove = (ev) => { if (arrastre === null) return; manual += (ev.clientX - arrastre) * 0.008; arrastre = ev.clientX; };
  const onUp = () => { arrastre = null; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  let raf = 0, t = 0, antes = 0;
  function medir() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    const actual = renderer.getSize(new THREE.Vector2());
    if (actual.x === w && actual.y === h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.fov = w / h < 1.1 ? 42 : 32;   // en pantallas angostas se aleja un poco para que quepa todo el pais
    camara.updateProjectionMatrix();
  }
  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min((ahora - (antes || ahora)) / 1000, 0.1); antes = ahora;
    t += dt;
    medir();
    if (arrastre === null) manual *= Math.pow(0.4, dt);   // lo girado a mano se desvanece despacio
    angulo = Math.sin(t * 0.3) * 0.38 + manual;
    giro.rotation.z = angulo;
    const k = (t % 1.8) / 1.8;
    aro.scale.setScalar(1 + k * 2.2); aroMat.opacity = 1 - k;
    renderer.render(escena, camara);
  }
  const iniciar = () => { if (!raf) { antes = 0; raf = requestAnimationFrame(cuadro); } };
  const detener = () => { cancelAnimationFrame(raf); raf = 0; arrastre = null; };
  function destruir() {
    detener();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    escena.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); }
    });
    renderer.dispose();
  }
  return { iniciar, detener, destruir };
}
