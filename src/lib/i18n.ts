import config from "../../site.config";

type Dict = { [k: string]: string | Dict | Dict[] | string[] };

const dicts: Record<string, Dict> = {};
for (const l of config.locales) {
  dicts[l] = (await import(`../i18n/${l}.json`)).default as Dict;
}

export const defaultLocale = config.locales[0]!;
export const missing = new Set<string>();

function lookup(d: Dict, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Dict)[k] : undefined), d);
}

/** Traductor para un idioma. Si la clave no existe cae al idioma por defecto y la registra como faltante. */
export function translator(locale: string) {
  const t = (key: string, vars: Record<string, string | number> = {}): string => {
    let v = lookup(dicts[locale]!, key);
    if (typeof v !== "string") {
      missing.add(`${locale}:${key}`);
      v = lookup(dicts[defaultLocale]!, key);
    }
    if (typeof v !== "string") return key;
    return v.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  };
  /** Para listas/objetos (features, faq…) */
  t.list = <T = Dict>(key: string): T[] => {
    const v = lookup(dicts[locale]!, key) ?? lookup(dicts[defaultLocale]!, key);
    return Array.isArray(v) ? (v as T[]) : [];
  };
  return t;
}
export type T = ReturnType<typeof translator>;

/** "/" para el idioma por defecto, "/en/" para los demás. slug sin barras: "" | "servicios" */
export function localePath(locale: string, slug = ""): string {
  const base = locale === defaultLocale ? "/" : `/${locale}/`;
  return slug ? `${base}${slug}/` : base;
}

export const absolute = (path: string) => config.url + path;

/** Etiquetas BCP-47 para og:locale (es → es_CO, en → en_US). Ajusta a tu mercado. */
export const ogLocale: Record<string, string> = { es: "es_CO", en: "en_US", pt: "pt_BR", fr: "fr_FR", de: "de_DE", it: "it_IT" };
