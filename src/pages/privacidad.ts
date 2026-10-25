import { html } from "../lib/html";
import { definePage } from "../lib/layout";
import { localePath } from "../lib/i18n";

interface Seccion { titulo: string; parrafos?: string[]; lista?: string[]; nota?: string }

/** /privacidad/: política de tratamiento de datos (Ley 1581 de 2012). Textos en src/i18n/*.json → privacy. */
export default definePage({
  slug: "privacidad",
  meta: (t) => ({ title: t("privacy.meta.title"), description: t("privacy.meta.description"),
                  breadcrumb: t("privacy.meta.title"), priority: 0.3, changefreq: "yearly" }),
  render: ({ t, locale }) => html`
    <section class="section legal-pagina">
      <div class="container narrow prose">
        <p class="cl-eyebrow">${t("privacy.vigencia")}</p>
        <h1>${t("privacy.title")}</h1>
        <p class="legal-intro">${t("privacy.intro")}</p>
        ${t.list<Seccion>("privacy.secciones").map((s) => html`<section class="legal-bloque">
          <h2>${s.titulo}</h2>
          ${(s.parrafos ?? []).map((p) => html`<p>${p}</p>`)}
          ${s.lista ? html`<ul>${s.lista.map((i) => html`<li>${i}</li>`)}</ul>` : ""}
          ${s.nota ? html`<p>${s.nota}</p>` : ""}
        </section>`)}
        <p><a class="btn btn-2" href="${localePath(locale)}">${t("privacy.volver")}</a></p>
      </div>
    </section>`,
});
