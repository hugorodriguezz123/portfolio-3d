import { raw } from "./html";

/** Iconos de trazo 24x24 en línea: cero peticiones HTTP. Sustitúyelos por los oficiales si la marca lo exige. */
const P: Record<string, string> = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>',
  facebook: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.5 2.3 4.2 5 4.5"/>',
  github: '<path d="M9 19c-4 1.3-4-2-6-2.5m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  whatsapp: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-.9.9a5 5 0 0 1-2.4-2.4l.9-.9-1-2z"/>',
  telegram: '<path d="M21 4L3 11l6 2.5M21 4l-3 16-9-6.5M21 4L9 13.5V19l3-3.5"/>',
  threads: '<path d="M16.5 11.5c-.5-3-2.5-4-4.5-4-2.5 0-4 1.8-4 4.5S9.5 17 12 17c3 0 4.5-1.5 4.5-4 0-2-1.5-3-3.5-3-1.7 0-2.5 1-2.5 2s.8 1.8 2 1.8c2.5 0 3-2.3 3-4.3M19.5 8A8 8 0 1 0 20 12"/>',
  pinterest: '<circle cx="12" cy="12" r="9"/><path d="M11 9.5c0-1.5 1-2.5 2.5-2.5S16 8 16 10c0 2.5-1.5 4-3 4-1 0-1.5-.5-1.5-1.5M11.5 11l-2 9"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
};

export function icon(name: string, size = 22) {
  return raw(
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] ?? ""}</svg>`,
  );
}

export const networkName: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", x: "X", linkedin: "LinkedIn", youtube: "YouTube",
  tiktok: "TikTok", github: "GitHub", whatsapp: "WhatsApp", telegram: "Telegram", threads: "Threads",
  pinterest: "Pinterest", email: "Email",
};
