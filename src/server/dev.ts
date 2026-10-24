import { watch } from "node:fs";
import { createHandler } from "./serve";

/**
 * Desarrollo: compila, sirve dist/ y recarga el navegador al guardar cambios.
 * Recompila en un subproceso para que site.config.ts, i18n y páginas se relean siempre frescos.
 */
const clients = new Set<ReadableStreamDefaultController>();
const reloadScript = `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>`;

async function build() {
  const t = performance.now();
  const p = Bun.spawn(["bun", "run", "build.ts", "--dev"], { stdout: "inherit", stderr: "inherit" });
  if ((await p.exited) === 0) {
    console.log(`✓ build ${Math.round(performance.now() - t)} ms`);
    for (const c of clients) c.enqueue("data: reload\n\n");
  }
}

await build();
const handler = createHandler({ dev: true, inject: reloadScript });
const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  idleTimeout: 0,
  fetch(req, srv) {
    if (new URL(req.url).pathname === "/__reload") {
      let ctrl: ReadableStreamDefaultController;
      return new Response(new ReadableStream({
        start(c) { ctrl = c; clients.add(c); },
        cancel() { clients.delete(ctrl); },
      }), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
    }
    return handler(req, srv);
  },
});
console.log(`▶ Dev en ${server.url}`);

let timer: Timer | undefined;
for (const dir of ["src", "public", "site.config.ts", "build.ts"]) {
  watch(dir, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(build, 80); });
}
