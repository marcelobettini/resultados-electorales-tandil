import { describe, expect, it } from "vitest";
import { displayValue, formatDate, formatNumber, formatPercentage } from "@/lib/format";

describe("formatNumber", () => {
  it("devuelve guión para null/undefined", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });

  it("formatea miles con punto en español", () => {
    expect(formatNumber(119911)).toBe("119.911");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatPercentage", () => {
  it("devuelve guión para null/undefined", () => {
    expect(formatPercentage(null)).toBe("—");
    expect(formatPercentage(undefined)).toBe("—");
  });

  it("formatea con dos decimales y separador decimal de coma", () => {
    expect(formatPercentage(35.25)).toBe("35,25 %");
    expect(formatPercentage(50)).toBe("50,00 %");
  });
});

describe("formatDate", () => {
  it("devuelve guión para null/undefined/vacío", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("formatea fecha ISO en español", () => {
    expect(formatDate("2023-10-22")).toBe("22 de octubre de 2023");
  });
});

describe("displayValue", () => {
  it("devuelve guión para null/undefined/vacío", () => {
    expect(displayValue(null)).toBe("—");
    expect(displayValue(undefined)).toBe("—");
    expect(displayValue("")).toBe("—");
  });

  it("devuelve el valor como string", () => {
    expect(displayValue("U.C.R. Intransigente")).toBe("U.C.R. Intransigente");
    expect(displayValue(0)).toBe("0");
  });
});
