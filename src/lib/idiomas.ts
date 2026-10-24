import config from "../../site.config";
import { html } from "./html";
import { localePath, type T } from "./i18n";

/**
 * Selector de idioma (ES · EN) para la barra superior. Cada enlace lleva a la misma página en el otro idioma;
 * en la oficina 3D, main.ts le suma el #sección actual para no perder dónde estabas.
 */
export function selectorIdioma(locale: string, t: T, slug = "") {
  if (!config.i18nSwitcher || config.locales.length < 2) return "";
  return html`<nav class="idiomas" aria-label="${t("a11y.language")}">${config.locales.map((l) =>
    html`<a href="${localePath(l, slug)}" hreflang="${l}" lang="${l}" data-idioma${l === locale ? html` aria-current="true"` : ""}
       title="${t(`languages.${l}`)}">${l.toUpperCase()}</a>`)}</nav>`;
}
