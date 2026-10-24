import { html } from "./html";

/**
 * Logotipo de JHS Software Solutions: la sigla JHS y, pegadas a la S (que sirve para las dos palabras),
 * "oftware" arriba y "olutions" abajo. Lo visual va oculto a lectores de pantalla y buscadores, que leen
 * el nombre completo del texto oculto (.sr-only).
 */
export const marca = (clase = "") =>
  html`<span class="sr-only">JHS Software Solutions</span><span class="lockup${clase ? ` ${clase}` : ""}" aria-hidden="true"><span class="lockup-sigla">JHS</span> <span class="lockup-pila"><span>oftware</span> <span>olutions</span></span></span>`;

/** Versión de la barra superior: la sigla en su recuadro y las dos palabras al lado. */
export const marcaBarra = () =>
  html`<span class="sello display">JHS</span> <span class="lockup-pila marca-pila display"><span>Software</span> <span>Solutions</span></span>`;
