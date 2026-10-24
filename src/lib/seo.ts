import config from "../../site.config";
import { html, raw } from "./html";
import { absolute, localePath, ogLocale, defaultLocale, type T } from "./i18n";

/** Versión para quien no habla ninguno de los idiomas del sitio: inglés si existe (igual que la redirección automática). */
const idiomaX = config.locales.includes("en") ? "en" : defaultLocale;

export interface PageMeta {
  slug: string;              // "" = home
  title: string;             // ya traducido
  description: string;       // 140–160 caracteres
  image?: string;            // OG específico (1200x630)
  type?: "website" | "article";
  noindex?: boolean;
  breadcrumb?: string;       // nombre para BreadcrumbList en subpáginas
  jsonLd?: object[];         // schemas extra (FAQPage, Product, Service…)
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
}

export const jsonLd = (data: object) =>
  raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`);

export function seoHead(meta: PageMeta, locale: string) {
  const url = absolute(localePath(locale, meta.slug));
  const title = meta.slug === "" ? meta.title : config.seo.titleTemplate.replace("%s", meta.title);
  const image = absolute(meta.image ?? config.seo.ogImage);

  return html`
    <title>${title}</title>
    <meta name="description" content="${meta.description}">
    <link rel="canonical" href="${url}">
    ${meta.noindex ? html`<meta name="robots" content="noindex,follow">`
      : html`<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`}
    ${config.locales.map((l) => html`<link rel="alternate" hreflang="${l}" href="${absolute(localePath(l, meta.slug))}">`)}
    <link rel="alternate" hreflang="x-default" href="${absolute(localePath(idiomaX, meta.slug))}">

    <meta property="og:type" content="${meta.type ?? "website"}">
    <meta property="og:site_name" content="${config.name}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${meta.description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${meta.title}">
    <meta property="og:locale" content="${ogLocale[locale] ?? locale}">
    ${config.locales.filter((l) => l !== locale).map((l) => html`<meta property="og:locale:alternate" content="${ogLocale[l] ?? l}">`)}

    <meta name="twitter:card" content="summary_large_image">
    ${config.seo.twitterHandle ? html`<meta name="twitter:site" content="${config.seo.twitterHandle}">` : ""}
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${meta.description}">
    <meta name="twitter:image" content="${image}">`;
}

/** Schemas base presentes en todas las páginas */
export function baseSchemas(meta: PageMeta, locale: string, t: T) {
  const org = config.seo.organization;
  const orgId = `${config.url}/#organization`;
  const url = absolute(localePath(locale, meta.slug));
  const graph: object[] = [
    {
      "@type": org.type,
      "@id": orgId,
      name: config.name,
      url: config.url,
      logo: absolute(org.logo),
      image: absolute(config.seo.ogImage),
      email: org.email,
      telephone: org.telephone,
      address: org.address && {
        "@type": "PostalAddress",
        streetAddress: org.address.street,
        addressLocality: org.address.city,
        addressRegion: org.address.region,
        postalCode: org.address.postalCode,
        addressCountry: org.address.country,
      },
      sameAs: config.social.filter((s) => s.network !== "email" && s.network !== "whatsapp").map((s) => s.url),
    },
    {
      "@type": "WebSite",
      "@id": `${config.url}/#website`,
      url: config.url,
      name: config.name,
      inLanguage: config.locales,
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: meta.title,
      description: meta.description,
      inLanguage: locale,
      isPartOf: { "@id": `${config.url}/#website` },
      about: { "@id": orgId },
    },
  ];
  if (meta.slug) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("nav.home"), item: absolute(localePath(locale)) },
        { "@type": "ListItem", position: 2, name: meta.breadcrumb ?? meta.title, item: url },
      ],
    });
  }
  return jsonLd({ "@context": "https://schema.org", "@graph": [...graph, ...(meta.jsonLd ?? [])] });
}

/** FAQPage a partir de una lista {q, a} — útil para rich results */
export const faqSchema = (items: { q: string; a: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
});

export function sitemap(pages: PageMeta[]) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.filter((p) => !p.noindex).flatMap((p) =>
    config.locales.map((l) => `  <url>
    <loc>${absolute(localePath(l, p.slug))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq ?? "monthly"}</changefreq>
    <priority>${(p.priority ?? (p.slug ? 0.7 : 1)).toFixed(1)}</priority>
${config.locales.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${absolute(localePath(a, p.slug))}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(localePath(idiomaX, p.slug))}"/>
  </url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}

export const robots = () => `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${config.url}/sitemap.xml
`;
