// Línea de tiempo común (ciclo de 8 s) a partir de atributos, para que cada animación solo declare tiempos:
//   data-en="1.2"     aparece en el segundo 1.2 (data-sale="7.4" se va; data-desde="scale(.8)" cambia la entrada)
//   data-traza="0.5"  trazo SVG que se dibuja desde el segundo 0.5 (data-dura="1.2" lo que tarda)
// Todo queda como animaciones CSS: el grabador las pausa y fija su tiempo cuadro a cuadro.
// Va en un bloque propio para no chocar con las variables de los scripts de cada animación.
{
// Idioma: con ?lang=en se traducen los textos (el grabador genera <id>.en.mp4). data-t-en="…" fija la traducción
// de un elemento completo (títulos partidos en dos líneas); el resto se busca texto por texto en este diccionario.
const EN = {"+ escalado automático": "+ auto scaling", "26,5 °C": "26.5 °C", "26,8 °C": "26.8 °C", "27,1 °C": "27.1 °C", "62 %": "62%", "58 %": "58%", "55 %": "55%", "99,9 %": "99.9%", "2,4": "2.4", "API en la nube": "Cloud API", "API y base de datos": "API and database", "Apps web": "Web apps", "Asistentes": "Assistants", "Automatización": "Automation", "Balanceador": "Load balancer", "Base de datos": "Database", "Bases de datos": "Databases", "Catálogo y presentaciones": "Catalogs and presentations", "Certificado": "Certificate", "Contenedores": "Containers", "Correos, reportes y tareas": "Emails, reports and tasks", "Código": "Code", "Código fuente y proyecto completo: es tuyo": "Source code and full project: it's yours", "Datos seguros y respaldados": "Secure, backed-up data", "De apps sencillas a apps avanzadas, para Android e iOS.": "From simple apps to advanced apps, for Android and iOS.", "Del sensor al tablero, en tiempo real.": "From sensor to dashboard, in real time.", "Desarrollo mobile": "Mobile development", "Despliegue": "Deploy", "Diario": "Daily", "Diseño 3D": "3D design", "Diseño mecánico": "Mechanical design", "Disponible": "Uptime", "Dispositivo": "Device", "Dominio y HTTPS": "Domain and HTTPS", "En línea": "Online", "Entrega": "Delivery", "Estaciones": "Stations", "Gestionada": "Managed", "Humedad": "Humidity", "Impresión 3D": "3D printing", "Integraciones y lógica": "Integrations and logic", "Landing pages y apps web": "Landing pages and web apps", "Lecturas": "Readings", "Material:": "Material:", "Modelado": "Modeling", "Modelado, render e impresión 3D.": "Modeling, rendering and 3D printing.", "Modelos predictivos": "Predictive models", "Monitoreo": "Monitoring", "Máx. 42 MPa": "Max. 42 MPa", "Notificaciones": "Notifications", "Notificaciones y sincronización": "Notifications and syncing", "Nube": "Cloud", "Nuevo pedido recibido": "New order received", "Piezas y mecanismos listos para fabricar.": "Parts and mechanisms ready to manufacture.", "Planos": "Drawings", "Productos, piezas y espacios": "Products, parts and spaces", "Prototipos": "Prototypes", "Prototipos y piezas finales": "Prototypes and final parts", "Pruebas": "Tests", "Red neuronal": "Neural network", "Redes neuronales": "Neural networks", "Render": "Rendering", "Reparte el tráfico": "Spreads the traffic", "Reporte enviado al equipo automáticamente": "Report sent to the team automatically", "Respaldo": "Backup", "Respaldos": "Backups", "Segundo plano": "Background jobs", "Según el modelo,": "According to the model,", "Sensores": "Sensors", "Servidores": "Servers", "Sesión, datos y reglas": "Sessions, data and rules", "Simulación": "Simulation", "Simulación de esfuerzos": "Stress simulation", "Tablero": "Dashboard", "Tableros": "Dashboards", "Temperatura": "Temperature", "Tu cita fue confirmada": "Your appointment is confirmed", "Usuarios": "Users", "Viento": "Wind", "aluminio 6061": "6061 aluminum", "firmware propio": "custom firmware", "hace un momento": "just now", "monitoreo y alertas": "monitoring and alerts", "pronóstico": "forecast", "que en noviembre.": "than in November.", "sincronizado": "synced", "un 18 % más": "18% more", "· factor de seguridad": "· safety factor", "¿Cuántas ventas esperamos en diciembre?": "How many sales should we expect in December?", "⚠ Humedad del suelo por debajo del 56 %": "⚠ Soil moisture below 56%", "✓ Riego activado de forma remota": "✓ Irrigation switched on remotely", "SERVICIO 01": "SERVICE 01", "SERVICIO 02": "SERVICE 02", "SERVICIO 03": "SERVICE 03", "SERVICIO 04": "SERVICE 04", "SERVICIO 05": "SERVICE 05", "SERVICIO 06": "SERVICE 06", "SERVICIO 07": "SERVICE 07"};
if (new URLSearchParams(location.search).get("lang") === "en") {
  document.documentElement.lang = "en";
  document.querySelectorAll("[data-t-en]").forEach((el) => { el.innerHTML = el.dataset.tEn; });
  const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) {
    const texto = n.nodeValue.trim();
    if (EN[texto] && !n.parentElement.closest("[data-t-en], script, style")) n.nodeValue = n.nodeValue.replace(texto, EN[texto]);
  }
}
const T = 8;
const pct = (s) => Math.max(0, Math.min(100, (s / T) * 100)).toFixed(3);
let css = "";
document.querySelectorAll("[data-en]").forEach((el, i) => {
  const a = +el.dataset.en, s = +(el.dataset.sale ?? 7.4), desde = el.dataset.desde ?? "translateY(18px)";
  css += `@keyframes en${i}{0%,${pct(a)}%{opacity:0;transform:${desde}}${pct(Math.min(a + 0.4, s))}%,${pct(s)}%{opacity:1;transform:none}${pct(s + 0.3)}%,100%{opacity:0;transform:none}}`;
  el.style.animation = `en${i} ${T}s linear infinite`;
});
document.querySelectorAll("[data-traza]").forEach((el, i) => {
  const L = Math.ceil(el.getTotalLength()), a = +el.dataset.traza, d = +(el.dataset.dura ?? 1), s = +(el.dataset.sale ?? 7.4);
  el.style.strokeDasharray = `${L}`;
  css += `@keyframes tz${i}{0%,${pct(a)}%{stroke-dashoffset:${L};opacity:1}${pct(a + d)}%,${pct(s)}%{stroke-dashoffset:0;opacity:1}${pct(s + 0.3)}%,100%{stroke-dashoffset:0;opacity:0}}`;
  el.style.animation = `tz${i} ${T}s ease-in-out infinite`;
});
const estilo = document.createElement("style");
estilo.textContent = css;
document.head.appendChild(estilo);
}
