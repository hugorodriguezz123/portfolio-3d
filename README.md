# JH Solutions — sitio web con oficina 3D

Sitio estático generado con [Bun](https://bun.sh): el HTML se pre-renderiza (bueno para Google y para
cargar rápido) y la oficina 3D (three.js) se descarga aparte, después de pintar la portada.

## Requisitos

- Bun 1.1 o superior: `powershell -c "irm bun.sh/install.ps1 | iex"` (Windows) o `curl -fsSL https://bun.sh/install | bash`

## Comandos

```bash
bun install          # dependencias (una sola vez)
bun run dev          # http://localhost:3000 con recarga automática al guardar
bun run check        # compila y audita SEO, enlaces y anclas (debe terminar sin ⚠ ni ✗)
bun run build        # deja el sitio listo para publicar en dist/
bun run start        # sirve dist/ como en producción (http://localhost:3000)
```

## Dónde se edita cada cosa

| Qué | Archivo |
|---|---|
| Dominio, nombre, datos de la empresa, redes, formulario | `site.config.ts` |
| **Todos los textos** (portada, servicios, proyectos, tecnologías, nosotros, taller, contacto) | `src/i18n/es.json` (español, en `/`) y `src/i18n/en.json` (inglés, en `/en/`): los dos con la misma estructura |
| Logotipo JHS (barra, portada y letrero) | `src/lib/marca.ts` |
| Estructura HTML de la oficina y sus paneles | `src/sections/oficina.ts` |
| Colores, fuentes, letrero de neón, paneles, versión móvil | `src/styles/main.css` |
| Navegación (clic, flechas, scroll, menú), formulario | `src/client/main.ts` |
| Motor 3D: posiciones de cámara, dónde se paran los personajes, objetos que se pueden seleccionar | `src/client/escena/escena.js` (`ESTADOS` y `SELECCIONABLES`) |
| Modelos 3D (oficina y personajes) | `public/modelos/*.glb` |
| Foto de los fundadores, íconos, imagen para redes | `public/images/` |

Los textos entre corchetes, como `[TU CORREO]` o `[Proyecto 2]`, son datos que faltan por completar.

### Proyectos y videos en la pantalla central

Cada proyecto de `src/i18n/es.json` → `proyectos.items` tiene un campo `video`. Copia el archivo a
`public/videos/` (MP4 H.264, sin audio, 1280 px de ancho es suficiente) y escribe su ruta, por ejemplo
`"video": "/videos/proyecto-2.mp4"`. Al seleccionar ese proyecto, el video se reproduce en la pantalla
central de la oficina. En lugar de `video` puede llevar `imagen` (por ejemplo `"/images/proyectos/x.webp"`).
Para sumar o quitar proyectos basta con editar esa lista.

### Animaciones de servicios (pantalla izquierda)

Cada servicio (`servicios.items`) tiene un `video` que se muestra en la pantalla izquierda al seleccionarlo.
Esos videos se generan a partir de las animaciones HTML de `animaciones/servicios/<id>.html` (8 s en bucle):
`<id>.mp4` en español y `<id>.en.mp4` en inglés (los textos en inglés están en `animaciones/servicios/base.js`).
Después de editar una animación, regrábala con Chrome y ffmpeg instalados:

```bash
bun run animaciones                  # todas, en los dos idiomas
bun run animaciones web iot          # solo esas
IDIOMAS=en bun run animaciones web   # solo la versión en inglés
```

Para grabar varias a la vez, abre otra terminal con otro `PUERTO` (por ejemplo `PUERTO=9350 bun run animaciones ia`).

### Actualizar los modelos 3D

Los `.glb` salen del archivo de Blender `OficinaIA_fuente.blend` con sus scripts internos
`export_web.py` (oficina) y `export_personaje.py` (personajes). Copia los nuevos archivos a
`public/modelos/` con los mismos nombres y sube el número `VERSION_MODELOS` en `src/client/main.ts`
para que los navegadores no usen la copia anterior.

## Formulario de contacto

Viene configurado con [Web3Forms](https://web3forms.com) (gratis y sin servidor): crea una cuenta con el
correo donde quieres recibir los mensajes y pega la *access key* en `site.config.ts` → `contact.accessKey`.

¿Prefieres enviar con tu propio dominio? Cambia `provider` a `"resend"`, crea `.env` a partir de
`.env.example` y publica con el servidor de Bun (`bun run start`, ver abajo).

## Publicar

**Hosting estático (recomendado):** Cloudflare Pages, Netlify o Vercel.
Comando de build `bun run build`, carpeta de salida `dist`. Las cabeceras de caché y seguridad
(`_headers`, `vercel.json`) se generan solas.

**Servidor propio:** `bun run build && bun run start` (o el Dockerfile de la guía de Bun). Necesario solo
si usas Resend o SMTP para el formulario.

### Antes de publicar

- [ ] `url` real en `site.config.ts` (la usan el canonical, el sitemap y la imagen para redes).
- [ ] Access key de Web3Forms y una prueba de envío real.
- [ ] Completar los datos entre corchetes en `src/i18n/es.json` y el texto legal de `/privacidad/`.
- [ ] Reemplazar las tecnologías genéricas por las herramientas que realmente usan.
- [ ] Datos de la organización (correo, teléfono, ciudad) en `site.config.ts` → `seo.organization`.
- [ ] `bun run check` sin avisos y enviar `sitemap.xml` a Google Search Console.

## Cómo funciona

- **Con JavaScript y WebGL:** la página arranca en modo 3D (`html.modo-3d`). La portada se ve de
  inmediato y la oficina aparece cuando terminan de cargar los modelos (unos 5,6 MB).
- **Sin JavaScript, o si el navegador no puede mostrar 3D:** la página se convierte en un documento
  normal con todas las secciones una debajo de otra. Ningún contenido depende del 3D.
- **Atajos:** ← Servicios · ↑ Proyectos · → Nosotros · ↓ Taller 3D e IoT · Esc vista general.
  En Proyectos, ← → cambian de proyecto. El escritorio abre Tecnologías y la mesa abre Contacto.
