import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

vi.mock("@/lib/queries/elections", () => ({
  getAllElectionYears: vi.fn(),
  LIST_TAG: "elections:list",
  electionTag: (year: number) => `election:${year}`,
}));

import { parseRevalidatePayload, secretMatches } from "@/lib/revalidate";

describe("parseRevalidatePayload (allowlist del contrato)", () => {
  it("acepta election_years con años válidos", () => {
    const result = parseRevalidatePayload({ election_years: [2023, 2027] });
    expect(result).toEqual({
      ok: true,
      payload: { electionYears: [2023, 2027], refreshAll: false },
    });
  });

  it("acepta refresh_all: true", () => {
    const result = parseRevalidatePayload({ refresh_all: true });
    expect(result).toEqual({ ok: true, payload: { electionYears: [], refreshAll: true } });
  });

  it("si llegan ambos, prevalece refresh_all", () => {
    const result = parseRevalidatePayload({ election_years: [2023], refresh_all: true });
    expect(result).toEqual({ ok: true, payload: { electionYears: [], refreshAll: true } });
  });

  it("rechaza body vacío sin refresh_all", () => {
    expect(parseRevalidatePayload({})).toEqual({ ok: false, error: "invalid_payload" });
  });

  it("rechaza claves fuera de la allowlist", () => {
    expect(parseRevalidatePayload({ election_years: [2023], path: "/foo" })).toEqual({
      ok: false,
      error: "invalid_payload",
    });
  });

  it("rechaza años no enteros o fuera de rango", () => {
    expect(parseRevalidatePayload({ election_years: ["2023"] })).toEqual({
      ok: false,
      error: "invalid_payload",
    });
    expect(parseRevalidatePayload({ election_years: [1800] })).toEqual({
      ok: false,
      error: "invalid_payload",
    });
  });

  it("rechaza body no-objeto y malformado", () => {
    expect(parseRevalidatePayload(null)).toEqual({ ok: false, error: "invalid_payload" });
    expect(parseRevalidatePayload("x")).toEqual({ ok: false, error: "invalid_payload" });
  });
});

describe("secretMatches (timingSafeEqual)", () => {
  const original = process.env.ISR_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.ISR_SECRET;
    else process.env.ISR_SECRET = original;
  });

  it("devuelve false si ISR_SECRET no está definido", () => {
    delete process.env.ISR_SECRET;
    expect(secretMatches("cualquiera")).toBe(false);
  });

  it("rechaza secretos ausentes", () => {
    process.env.ISR_SECRET = "secreto";
    expect(secretMatches(null)).toBe(false);
    expect(secretMatches(undefined)).toBe(false);
  });

  it("rechaza longitudes distintas sin comparar", () => {
    process.env.ISR_SECRET = "abc";
    expect(secretMatches("abcd")).toBe(false);
  });

  it("acepta el secreto correcto", () => {
    process.env.ISR_SECRET = "secreto-correcto";
    expect(secretMatches("secreto-correcto")).toBe(true);
  });
});
