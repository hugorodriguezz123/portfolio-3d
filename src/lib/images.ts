import { readdir, mkdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import config from "../../site.config";
import { html, attrs } from "./html";

interface ImgMeta { width: number; height: number; variants: { avif: string[]; webp: string[] } }
const manifest = new Map<string, ImgMeta>();
const SRC_DIR = "public/images";
const CACHE = ".cache/images";

/**
 * Genera variantes AVIF/WebP en varios anchos con sharp (si está instalado).
 * Se cachean en .cache/images y se copian a dist/images/_opt.
 */
export async function prepareImages(outDir: string) {
  let sharp: any;
  try { sharp = (await import("sharp")).default; } catch {
    console.warn("⚠  sharp no instalado: imágenes sin optimizar (bun add sharp)");
    return;
  }
  await mkdir(CACHE, { recursive: true });
  await mkdir(join(outDir, "images/_opt"), { recursive: true });
  const files = (await readdir(SRC_DIR).catch(() => [])).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !/^(og|icon|logo|apple-touch)/.test(f)); // estos se sirven tal cual

  await Promise.all(files.map(async (file) => {
    const src = join(SRC_DIR, file);
    const { name } = parse(file);
    const meta = await sharp(src).metadata();
    const srcMtime = (await stat(src)).mtimeMs;
    const widths = config.build.imageWidths.filter((w) => w < meta.width!).concat(meta.width!);
    const variants: ImgMeta["variants"] = { avif: [], webp: [] };

    for (const w of [...new Set(widths)]) {
      for (const fmt of ["avif", "webp"] as const) {
        const out = `${name}-${w}.${fmt}`;
        const cached = join(CACHE, out);
        const fresh = await stat(cached).then((s) => s.mtimeMs > srcMtime).catch(() => false);
        if (!fresh) {
          await sharp(src).resize({ width: w })[fmt]({ quality: fmt === "avif" ? 55 : 72 }).toFile(cached);
        }
        await Bun.write(join(outDir, "images/_opt", out), Bun.file(cached));
        variants[fmt].push(`/images/_opt/${out} ${w}w`);
      }
    }
    manifest.set(`/images/${file}`, { width: meta.width!, height: meta.height!, variants });
  }));
}

interface ImgProps {
  src: string;                 // "/images/hero.jpg"
  alt: string;                 // obligatorio: "" solo para imágenes decorativas
  sizes?: string;              // por defecto "100vw"
  /** true SOLO para la imagen LCP (hero): carga inmediata + fetchpriority=high */
  priority?: boolean;
  width?: number;
  height?: number;
  class?: string;
}

/** <picture> responsivo con AVIF/WebP, dimensiones explícitas (sin CLS) y lazy loading nativo. */
export function img(p: ImgProps) {
  const m = manifest.get(p.src);
  const width = p.width ?? m?.width;
  const height = p.height ?? m?.height;
  const sizes = p.sizes ?? "100vw";
  const imgTag = html`<img${attrs({
    src: p.src, alt: p.alt, width, height, class: p.class,
    loading: p.priority ? "eager" : "lazy",
    decoding: p.priority ? "sync" : "async",
    fetchpriority: p.priority ? "high" : undefined,
  })}>`;
  if (!m) return imgTag;
  return html`<picture>
    <source type="image/avif" srcset="${m.variants.avif.join(", ")}" sizes="${sizes}">
    <source type="image/webp" srcset="${m.variants.webp.join(", ")}" sizes="${sizes}">
    ${imgTag}
  </picture>`;
}

/** Para <link rel="preload"> de la imagen LCP en el <head>. */
export function preloadImage(src: string, sizes = "100vw") {
  const m = manifest.get(src);
  if (!m) return html`<link rel="preload" as="image" href="${src}" fetchpriority="high">`;
  return html`<link rel="preload" as="image" type="image/avif" imagesrcset="${m.variants.avif.join(", ")}" imagesizes="${sizes}" fetchpriority="high">`;
}
