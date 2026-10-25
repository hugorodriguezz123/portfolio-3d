import { definePage } from "../lib/layout";
import { html } from "../lib/html";
import { oficina, FOTO, FOTO_SIZES } from "../sections/oficina";
import { vistaClasica } from "../sections/clasica";

/** Home: la vista clásica (celulares y quien elige verla sin 3D) y la oficina 3D. El <head> decide cuál se ve. */
export default definePage({
  slug: "",
  inmersiva: true,
  lcpImage: { src: FOTO, sizes: FOTO_SIZES },
  meta: (t) => ({ title: t("home.meta.title"), description: t("home.meta.description"), priority: 1 }),
  render: (ctx) => html`${vistaClasica(ctx)}${oficina(ctx)}`,
});
