/**
 * Plantillas HTML con escape automático.
 *   html`<h1>${titulo}</h1>`   → escapa titulo
 *   html`${raw(svg)}`          → inserta sin escapar (solo contenido de confianza)
 * Los arrays se aplanan, null/undefined/false se omiten.
 */
export class Safe {
  constructor(public readonly value: string) {}
  toString() { return this.value; }
}

export const raw = (s: string) => new Safe(s);

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);

type Value = Safe | string | number | boolean | null | undefined | Value[];

function render(v: Value): string {
  if (v === null || v === undefined || v === false) return "";
  if (Array.isArray(v)) return v.map(render).join("");
  if (v instanceof Safe) return v.value;
  return escape(String(v));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Safe {
  let out = "";
  strings.forEach((s, i) => { out += s + (i < values.length ? render(values[i]) : ""); });
  return new Safe(out);
}

/** Atributos condicionales: attrs({ loading: "lazy", hidden: false }) */
export function attrs(a: Record<string, string | number | boolean | undefined | null>): Safe {
  return raw(
    Object.entries(a)
      .filter(([, v]) => v !== undefined && v !== null && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escape(String(v))}"`))
      .join(""),
  );
}

/** Minificado ligero y seguro de HTML (respeta <pre>, <textarea>, <script>). */
export function minifyHtml(s: string): string {
  const keep: string[] = [];
  s = s.replace(/<(pre|textarea|script|style)[\s\S]*?<\/\1>/gi, (m) => `\u0000${keep.push(m) - 1}\u0000`);
  s = s.replace(/<!--(?!\[if)[\s\S]*?-->/g, "").replace(/(>|\u0000)\s*\n\s*(<|\u0000)/g, "$1$2").replace(/\s{2,}/g, " ").trim();
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]!);
}
