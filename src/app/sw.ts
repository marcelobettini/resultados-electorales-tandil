import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

type SwSelf = SerwistGlobalConfig & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

declare const self: SwSelf;

/**
 * Estrategias por defecto de Serwist para Next.js (NetworkFirst en navegación:
 * online siempre se sirve contenido fresco; offline se usa la caché).
 * Se filtra la entrada que cachea `/api/*` (GET): el webhook es POST y nunca
 * debe quedar en caché del service worker.
 */
const runtimeCaching: RuntimeCaching[] = defaultCache.filter((entry) => {
  if (typeof entry.matcher === "function") {
    const source = entry.matcher.toString();
    const targetsApi = source.includes('pathname.startsWith("/api/")');
    const excludesApi = source.includes('!pathname.startsWith("/api/")');
    if (targetsApi && !excludesApi) {
      return false;
    }
  }
  return true;
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
