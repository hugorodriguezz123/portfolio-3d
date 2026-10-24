import { definePage } from "../lib/layout";
import { oficina, FOTO, FOTO_SIZES } from "../sections/oficina";

/** Home: la oficina 3D a pantalla completa con todas las secciones. */
export default definePage({
  slug: "",
  inmersiva: true,
  lcpImage: { src: FOTO, sizes: FOTO_SIZES },
  meta: (t) => ({ title: t("home.meta.title"), description: t("home.meta.description"), priority: 1 }),
  render: (ctx) => oficina(ctx),
});
