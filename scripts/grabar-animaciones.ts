/**
 * Graba las animaciones de animaciones/servicios/*.html como videos cortos: public/videos/servicios/<id>.mp4 (español)
 * y <id>.en.mp4 (inglés, abriendo la animación con ?lang=en). IDIOMAS=es o IDIOMAS=en graba solo uno.
 * Cada animación dura 8 s (CSS): se pausan y se fija su tiempo cuadro a cuadro, así el video repite sin cortes.
 *
 *   bun run scripts/grabar-animaciones.ts            → todas
 *   bun run scripts/grabar-animaciones.ts web iot    → solo esas
 *
 * Requiere Google Chrome y ffmpeg (variables CHROME y FFMPEG si no están en la ruta habitual).
 */
import { mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const ORIGEN = resolve("animaciones/servicios");
const DESTINO = resolve("public/videos/servicios");
const DURACION = 8, FPS = 30, ANCHO = 1600, ALTO = 900;
const PUERTO = Number(process.env.PUERTO ?? 9340);   // distinto por proceso para grabar varias en paralelo

const pedidos = process.argv.slice(2);
const ids = (await readdir(ORIGEN)).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).filter((id) => !pedidos.length || pedidos.includes(id));
await mkdir(DESTINO, { recursive: true });

const chrome = Bun.spawn([CHROME, "--headless=new", `--remote-debugging-port=${PUERTO}`, "--hide-scrollbars", `--window-size=${ANCHO},${ALTO}`,
  `--user-data-dir=${join(tmpdir(), `grabador-animaciones-${PUERTO}`)}`, "about:blank"], { stdout: "ignore", stderr: "ignore" });
await Bun.sleep(2500);
const pestanas = await (await fetch(`http://127.0.0.1:${PUERTO}/json`)).json();
const ws = new WebSocket(pestanas.find((t: any) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let n = 0;
const pendientes = new Map<number, (v: any) => void>();
ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)!(m.result); pendientes.delete(m.id); } };
const cdp = (method: string, params: any = {}) => new Promise<any>((r) => { const i = ++n; pendientes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluar = async (x: string) => (await cdp("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value;

await cdp("Page.enable");
// Se diseña a 1600×900 pero se captura a 1280×720 (escala 0,8): menos píxeles con brillos que dibujar
await cdp("Emulation.setDeviceMetricsOverride", { width: ANCHO, height: ALTO, deviceScaleFactor: 0.8, mobile: false });

const IDIOMAS = (process.env.IDIOMAS ?? "es,en").split(",");
for (const id of ids) for (const idioma of IDIOMAS) {
  const t0 = performance.now();
  const nombre = idioma === "es" ? id : `${id}.${idioma}`;
  const cuadros = join(tmpdir(), `anim-${nombre}`);
  await rm(cuadros, { recursive: true, force: true });
  await mkdir(cuadros, { recursive: true });
  await cdp("Page.navigate", { url: "file:///" + join(ORIGEN, `${id}.html`).replace(/\\/g, "/") + (idioma === "es" ? "" : `?lang=${idioma}`) });
  await Bun.sleep(1200);
  await evaluar("document.fonts.ready.then(() => true)");
  const total = DURACION * FPS;
  for (let k = 0; k < total; k++) {
    const ms = (k * 1000) / FPS;
    await evaluar(`(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ${ms}; } return true; })()`);
    const r = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 92 });
    await Bun.write(join(cuadros, `${String(k).padStart(4, "0")}.jpg`), Buffer.from(r.data, "base64"));
  }
  const salida = join(DESTINO, `${nombre}.mp4`);
  const ff = Bun.spawnSync([FFMPEG, "-v", "error", "-y", "-framerate", String(FPS), "-i", join(cuadros, "%04d.jpg"),
    "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", salida]);
  if (ff.exitCode !== 0) throw new Error(`ffmpeg falló con ${nombre}: ${ff.stderr}`);
  await rm(cuadros, { recursive: true, force: true });
  console.log(`✓ ${nombre}.mp4  ${(Bun.file(salida).size / 1024).toFixed(0)} KB  (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
}
chrome.kill();
process.exit(0);
