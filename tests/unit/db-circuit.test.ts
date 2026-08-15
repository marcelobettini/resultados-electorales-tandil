import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dbCircuitStats,
  esErrorDeConexion,
  isDbDegradado,
  reportarExitoDb,
  reportarFallaDb,
  resetDbCircuit,
} from "@/lib/seg/db-circuit";

const CIRCUIT_TTL = process.env.DB_CIRCUIT_TTL_MS;

beforeEach(() => {
  resetDbCircuit();
});

afterEach(() => {
  resetDbCircuit();
  vi.useRealTimers();
  if (CIRCUIT_TTL === undefined) delete process.env.DB_CIRCUIT_TTL_MS;
  else process.env.DB_CIRCUIT_TTL_MS = CIRCUIT_TTL;
});

describe("esErrorDeConexion", () => {
  it("reconoce códigos de error de conexión de mysql2", () => {
      for (const code of [
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "ECONNRESET",
        "EPIPE",
        "PROTOCOL_CONNECTION_LOST",
        "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
        "PROTOCOL_SEQUENCE_TIMEOUT",
        "ER_CON_COUNT_ERROR",
      ]) {
        const error = Object.assign(new Error(`boom (${code})`), { code });
        expect(esErrorDeConexion(error)).toBe(true);
      }
  });

  it("no reconoce errores sin código ni de otra naturaleza", () => {
    expect(esErrorDeConexion(new Error("sin código"))).toBe(false);
    expect(esErrorDeConexion("texto")).toBe(false);
    expect(esErrorDeConexion(null)).toBe(false);
    expect(esErrorDeConexion(undefined)).toBe(false);
    expect(esErrorDeConexion({})).toBe(false);
  });

  it("no trata un error de acceso (config) como caída transitoria", () => {
    const error = Object.assign(new Error("access denied"), {
      code: "ER_ACCESS_DENIED_ERROR",
    });
    expect(esErrorDeConexion(error)).toBe(false);
  });
});

describe("circuito de la base de datos", () => {
  it("empieza cerrado: la base no está degradada", () => {
    expect(isDbDegradado()).toBe(false);
    expect(dbCircuitStats().degradado).toBe(false);
  });

  it("se abre ante una falla de conexión y vuelve a reportar degradado", () => {
    reportarFallaDb(Object.assign(new Error("refused"), { code: "ECONNREFUSED" }));
    expect(isDbDegradado()).toBe(true);
    expect(dbCircuitStats().abiertoDesde).not.toBeNull();
  });

  it("una falla que no es de conexión no abre el circuito", () => {
    reportarFallaDb(new Error("otro error"));
    expect(isDbDegradado()).toBe(false);
  });

  it("se cierra ante un éxito", () => {
    reportarFallaDb(Object.assign(new Error("refused"), { code: "ECONNREFUSED" }));
    expect(isDbDegradado()).toBe(true);
    reportarExitoDb();
    expect(isDbDegradado()).toBe(false);
    expect(dbCircuitStats().abiertoDesde).toBeNull();
  });

  it("expira el TTL y vuelve a half-open (degradado en false)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    reportarFallaDb(Object.assign(new Error("refused"), { code: "ECONNREFUSED" }));
    expect(isDbDegradado()).toBe(true);
    vi.advanceTimersByTime(20_001);
    expect(isDbDegradado()).toBe(false);
  });

  it("respeta DB_CIRCUIT_TTL_MS desde el entorno", async () => {
    process.env.DB_CIRCUIT_TTL_MS = "5000";
    vi.resetModules();
    const mod = await import("@/lib/seg/db-circuit");
    mod.resetDbCircuit();
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    mod.reportarFallaDb(
      Object.assign(new Error("refused"), { code: "ECONNREFUSED" })
    );
    expect(mod.isDbDegradado()).toBe(true);
    vi.advanceTimersByTime(5_001);
    expect(mod.isDbDegradado()).toBe(false);
  });
});
