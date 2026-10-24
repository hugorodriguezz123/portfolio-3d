/** Tipos de la configuración del sitio. Toda la personalización vive en site.config.ts */

export type ThemeMode = "light" | "dark" | "system";

export type SocialNetwork =
  | "instagram" | "facebook" | "x" | "linkedin" | "youtube" | "tiktok"
  | "github" | "whatsapp" | "telegram" | "threads" | "pinterest" | "email";

export interface SocialLink {
  network: SocialNetwork;
  /** URL completa del perfil. Para whatsapp: https://wa.me/573001234567 */
  url: string;
  /** Ruta corta de redirección propia, p. ej. "/ig" → url. Opcional. */
  redirect?: string;
  /** Texto accesible; por defecto el nombre de la red. */
  label?: string;
}

export type VideoSource =
  | { provider: "youtube"; id: string }
  | { provider: "vimeo"; id: string }
  | { provider: "file"; src: string; type?: string };

export interface VideoItem {
  key: string;                 // id interno, se usa en las secciones: video("demo")
  source: VideoSource;
  /** Clave i18n (o texto) para título y descripción — también alimentan el JSON-LD VideoObject */
  title: string;
  description: string;
  /** Imagen de portada. Obligatoria para vimeo y file; opcional en youtube (se usa la miniatura). */
  poster?: string;
  uploadDate: string;          // ISO 8601, requerido por Google para VideoObject
  duration?: string;           // ISO 8601, p. ej. "PT1M30S"
  width?: number;
  height?: number;
  /** Solo "file": video de fondo silencioso en bucle (autoplay muted), carga diferida y pausa fuera de pantalla */
  ambient?: boolean;
}

export type ContactProvider = "resend" | "smtp" | "formspree" | "web3forms" | "none";

export interface ContactConfig {
  provider: ContactProvider;
  /**
   * resend/smtp → "/api/contact" (lo atiende src/server/serve.ts con Bun.serve).
   * formspree   → "https://formspree.io/f/XXXX"
   * web3forms   → "https://api.web3forms.com/submit"
   */
  endpoint: string;
  /** Solo web3forms: access key pública */
  accessKey?: string;
  /** Campos visibles del formulario */
  fields: Array<"name" | "email" | "phone" | "company" | "subject" | "message">;
}

export interface SiteConfig {
  url: string;                 // URL canónica de producción, sin barra final
  name: string;
  locales: string[];           // primero = idioma por defecto (sale en la raíz "/")
  i18nSwitcher: boolean;       // muestra el selector si hay >1 idioma
  theme: { default: ThemeMode; switcher: boolean };
  themeColor: { light: string; dark: string };
  seo: {
    titleTemplate: string;     // "%s | Marca"
    ogImage: string;           // 1200x630, ruta en /public
    twitterHandle?: string;
    organization: {
      type: "Organization" | "LocalBusiness" | "ProfessionalService" | "Person";
      logo: string;
      email?: string;
      telephone?: string;
      address?: { street?: string; city: string; region?: string; country: string; postalCode?: string };
    };
  };
  social: SocialLink[];
  videos: VideoItem[];
  contact: ContactConfig;
  build: {
    inlineCss: boolean;        // CSS en línea (recomendado si pesa < ~30 KB)
    imageWidths: number[];     // anchos generados por el pipeline de imágenes
  };
}

export const defineConfig = (c: SiteConfig) => c;
