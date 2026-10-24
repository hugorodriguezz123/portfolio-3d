import { html } from "../lib/html";
import { definePage } from "../lib/layout";
import { localePath } from "../lib/i18n";

/** /privacidad/: enlazada desde el formulario de contacto. Completa el texto legal en src/i18n/es.json. */
export default definePage({
  slug: "privacidad",
  meta: (t) => ({ title: t("privacy.meta.title"), description: t("privacy.meta.description"),
                  breadcrumb: t("privacy.meta.title"), priority: 0.3, changefreq: "yearly" }),
  render: ({ t, locale }) => html`
    <section class="section">
      <div class="container narrow prose">
        <h1>${t("privacy.title")}</h1>
        ${t.list<string>("privacy.paragraphs").map((p) => html`<p>${p}</p>`)}
        <p><a class="btn btn-2" href="${localePath(locale)}">${t("privacy.volver")}</a></p>
      </div>
    </section>`,
});
