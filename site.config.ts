import { defineConfig } from "./src/lib/types";

/**
 * ÚNICO punto de configuración del sitio.
 * Pendientes antes de publicar: url (tu dominio real), datos de la organización, redes y la
 * access key de Web3Forms (https://web3forms.com, gratis: llega al correo que registres).
 */
export default defineConfig({
  url: "https://www.tu-dominio.com",
  name: "JHS Software Solutions",

  // Español (por defecto, en /) e inglés (en /en/). Textos en src/i18n/es.json y src/i18n/en.json.
  locales: ["es", "en"],
  i18nSwitcher: true,

  // El diseño es oscuro: tema fijo, sin botón de cambio.
  theme: { default: "dark", switcher: false },
  themeColor: { light: "#07090e", dark: "#07090e" },

  seo: {
    titleTemplate: "%s | JHS Software Solutions",
    ogImage: "/images/og.jpg",
    organization: {
      type: "ProfessionalService",
      logo: "/images/logo.png",
      email: "forgesolutions123@gmail.com",
      telephone: "+57 316 097 8783",
      address: { city: "Bucaramanga", region: "Santander", country: "CO" },
    },
  },

  // Redes: { network: "instagram", url: "https://instagram.com/…", redirect: "/ig" }
  social: [],

  // El video o la imagen de cada proyecto en la pantalla central van en src/i18n/es.json → proyectos.items[].video | imagen
  videos: [],

  contact: {
    provider: "web3forms",
    endpoint: "https://api.web3forms.com/submit",
    accessKey: "c08901d0-e8e2-4275-b6a6-b8528b2eb797",
    fields: ["name", "email", "message"],
  },

  build: {
    inlineCss: false,   // pasa de 30 KB (vista clásica + oficina): mejor como archivo cacheado
    imageWidths: [480, 960, 1440],
  },
});
