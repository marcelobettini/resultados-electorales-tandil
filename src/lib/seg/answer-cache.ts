import { createHash } from "node:crypto";

interface CacheEntry {
  valor: unknown;
  expiraEn: number;
}

const globalForCache = globalThis as unknown as { answerCache?: Map<string, CacheEntry> };

function getCache(): Map<string, CacheEntry> {
  if (!globalForCache.answerCache) {
    globalForCache.answerCache = new Map<string, CacheEntry>();
  }
  return globalForCache.answerCache;
}

function ttlMs(): number {
  const raw = Number(process.env.ASK_CACHE_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 600000;
}

function maxEntries(): number {
  const raw = Number(process.env.ASK_CACHE_MAX_ENTRIES);
  return Number.isFinite(raw) && raw > 0 ? raw : 200;
}

export function normalizarPregunta(pregunta: string): string {
  return pregunta
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function clavePregunta(pregunta: string): string {
  return createHash("sha256").update(normalizarPregunta(pregunta)).digest("hex");
}

export function getRespuestaCacheada(pregunta: string): unknown | null {
  const cache = getCache();
  const clave = clavePregunta(pregunta);
  const entry = cache.get(clave);
  if (!entry) return null;
  if (entry.expiraEn <= Date.now()) {
    cache.delete(clave);
    return null;
  }
  cache.delete(clave);
  cache.set(clave, entry);
  return entry.valor;
}

export function setRespuestaCacheada(pregunta: string, respuesta: unknown): void {
  const cache = getCache();
  const clave = clavePregunta(pregunta);
  if (cache.has(clave)) cache.delete(clave);
  cache.set(clave, { valor: respuesta, expiraEn: Date.now() + ttlMs() });
  const max = maxEntries();
  while (cache.size > max) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export function clearCache(): void {
  getCache().clear();
}

export function cacheStats(): { size: number } {
  return { size: getCache().size };
}
