import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, resetRateLimit } from "@/lib/seg/rate-limit";
import {
  cacheStats,
  clearCache,
  clavePregunta,
  getRespuestaCacheada,
  normalizarPregunta,
  setRespuestaCacheada,
} from "@/lib/seg/answer-cache";

const RATE_LIMIT_MAX = process.env.ASK_RATE_LIMIT_MAX;
const CACHE_MAX_ENTRIES = process.env.ASK_CACHE_MAX_ENTRIES;

afterEach(() => {
  clearCache();
  vi.useRealTimers();
  if (RATE_LIMIT_MAX === undefined) delete process.env.ASK_RATE_LIMIT_MAX;
  else process.env.ASK_RATE_LIMIT_MAX = RATE_LIMIT_MAX;
  if (CACHE_MAX_ENTRIES === undefined) delete process.env.ASK_CACHE_MAX_ENTRIES;
  else process.env.ASK_CACHE_MAX_ENTRIES = CACHE_MAX_ENTRIES;
});

describe("checkRateLimit (sliding window)", () => {
  beforeEach(() => {
    resetRateLimit("test-key");
    resetRateLimit("test-key-2");
  });

  it("permite la primera consulta de una clave fresca", () => {
    const result = checkRateLimit("test-key", 1_000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
    expect(result.remaining).toBe(9);
  });

  it("deniega al superar el máximo dentro de la ventana", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("test-key", 1_000).allowed).toBe(true);
    }
    const denied = checkRateLimit("test-key", 1_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(denied.remaining).toBe(0);
  });

  it("vuelve a permitir cuando la ventana ya transcurrió", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("test-key", 1_000);
    expect(checkRateLimit("test-key", 1_000).allowed).toBe(false);
    expect(checkRateLimit("test-key", 1_000 + 60_001).allowed).toBe(true);
  });

  it("las claves son independientes", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("test-key", 1_000);
    expect(checkRateLimit("test-key", 1_000).allowed).toBe(false);
    expect(checkRateLimit("test-key-2", 1_000).allowed).toBe(true);
  });

  it("retryAfterMs es 0 cuando se permite", () => {
    expect(checkRateLimit("test-key", 1_000).retryAfterMs).toBe(0);
  });

  it("resetRateLimit limpia el estado de una clave", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("test-key", 1_000);
    expect(checkRateLimit("test-key", 1_000).allowed).toBe(false);
    resetRateLimit("test-key");
    expect(checkRateLimit("test-key", 1_000).allowed).toBe(true);
  });

  it("respeta ASK_RATE_LIMIT_MAX desde el entorno", async () => {
    process.env.ASK_RATE_LIMIT_MAX = "3";
    vi.resetModules();
    const mod = await import("@/lib/seg/rate-limit");
    mod.resetRateLimit("env-key");
    const now = 1_000;
    expect(mod.checkRateLimit("env-key", now).allowed).toBe(true);
    expect(mod.checkRateLimit("env-key", now).allowed).toBe(true);
    expect(mod.checkRateLimit("env-key", now).allowed).toBe(true);
    const denied = mod.checkRateLimit("env-key", now);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });
});

describe("normalizarPregunta", () => {
  it("normaliza mayúsculas, espacios y puntuación conservando acentos", () => {
    expect(normalizarPregunta("  ¿Qué DIFERENCIA   hubo? ")).toBe("qué diferencia hubo");
  });

  it("conserva letras acentuadas", () => {
    expect(normalizarPregunta("¿cuántos?")).toBe("cuántos");
  });

  it("devuelve cadena vacía para entrada vacía o de solo espacios", () => {
    expect(normalizarPregunta("")).toBe("");
    expect(normalizarPregunta("   ")).toBe("");
  });
});

describe("clavePregunta", () => {
  it("es determinística y un hash sha-256 hex de 64 caracteres", () => {
    const key = clavePregunta("¿Qué DIFERENCIA hubo?");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(clavePregunta("¿Qué DIFERENCIA hubo?")).toBe(key);
  });

  it("difiere para preguntas que normalizan distinto", () => {
    expect(clavePregunta("¿quién ganó?")).not.toBe(clavePregunta("ganó quién"));
  });

  it("comparte clave entre preguntas con la misma normalización", () => {
    expect(clavePregunta("¿Qué DIFERENCIA?!")).toBe(clavePregunta("qué   diferencia"));
  });
});

describe("caché de respuestas", () => {
  it("devuelve el valor almacenado y null para claves desconocidas", () => {
    expect(getRespuestaCacheada("pregunta inexistente")).toBeNull();
    const respuesta = { categoria: "presidente", anio: 2023, limite: 5 };
    setRespuestaCacheada("¿Qué DIFERENCIA hubo?", respuesta);
    expect(getRespuestaCacheada("qué DIFERENCIA hubo!!")).toEqual(respuesta);
    expect(getRespuestaCacheada("otra pregunta")).toBeNull();
  });

  it("expira la entrada al superar ASK_CACHE_TTL_MS", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    setRespuestaCacheada("pregunta con ttl", { x: 1 });
    expect(getRespuestaCacheada("pregunta con ttl")).toEqual({ x: 1 });
    vi.advanceTimersByTime(600_001);
    expect(getRespuestaCacheada("pregunta con ttl")).toBeNull();
  });

  it("evicta la entrada más antigua según ASK_CACHE_MAX_ENTRIES", async () => {
    process.env.ASK_CACHE_MAX_ENTRIES = "2";
    vi.resetModules();
    const mod = await import("@/lib/seg/answer-cache");
    mod.clearCache();
    mod.setRespuestaCacheada("pregunta uno", "respuesta 1");
    mod.setRespuestaCacheada("pregunta dos", "respuesta 2");
    mod.setRespuestaCacheada("pregunta tres", "respuesta 3");
    expect(mod.cacheStats().size).toBe(2);
    expect(mod.getRespuestaCacheada("pregunta uno")).toBeNull();
    expect(mod.getRespuestaCacheada("pregunta dos")).toBe("respuesta 2");
    expect(mod.getRespuestaCacheada("pregunta tres")).toBe("respuesta 3");
  });

  it("clearCache vacía la caché", () => {
    setRespuestaCacheada("una pregunta", 1);
    setRespuestaCacheada("otra pregunta", 2);
    expect(cacheStats().size).toBe(2);
    clearCache();
    expect(cacheStats().size).toBe(0);
    expect(getRespuestaCacheada("una pregunta")).toBeNull();
  });

  it("cacheStats().size refleja el tamaño actual", () => {
    expect(cacheStats().size).toBe(0);
    setRespuestaCacheada("a", 1);
    setRespuestaCacheada("b", 2);
    expect(cacheStats().size).toBe(2);
  });
});
