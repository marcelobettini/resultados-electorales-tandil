import { beforeAll, describe, expect, it } from "vitest";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import {
  cargoElegidoEnAnio,
  existeAnio,
  maxAnio,
  resolveYear,
} from "@/lib/consultas/years";
import type { CargoLocal } from "@/lib/types";

interface MaxAnioRow extends RowDataPacket {
  m: number | null;
}

interface EleccionCargosRow extends RowDataPacket {
  elige_intendente: number;
  cantidad_concejales: number | null;
  cantidad_consejeros: number | null;
}

// Sondeo de disponibilidad de la BD en tiempo de recolección: describe.skipIf
// necesita el valor ANTES de que corra beforeAll, por eso se sondea a nivel módulo.
let noDb = false;
try {
  await db.query<RowDataPacket[]>("SELECT 1");
} catch {
  noDb = true;
}

let anioExistente: number;
const anioInexistente = 9999;
let filaCargos: EleccionCargosRow;

beforeAll(async () => {
  const [maxRows] = await db.query<MaxAnioRow[]>(
    "SELECT MAX(anio) AS m FROM elecciones"
  );
  const max = maxRows[0]?.m ?? null;
  if (max === null) {
    throw new Error("Fixture inválida: la BD local no tiene elecciones cargadas.");
  }
  anioExistente = max;

  const [rows] = await db.query<EleccionCargosRow[]>(
    "SELECT elige_intendente, cantidad_concejales, cantidad_consejeros FROM elecciones WHERE anio = ?",
    [anioExistente]
  );
  if (rows.length === 0) {
    throw new Error(`Fixture inválida: no existe la elección del año ${anioExistente}.`);
  }
  filaCargos = rows[0];
});

describe.skipIf(noDb)("resolución de año contra la BD real", () => {
  it("existeAnio es true para el año probado y false para uno inexistente", async () => {
    expect(await existeAnio(anioExistente)).toBe(true);
    expect(await existeAnio(anioInexistente)).toBe(false);
  });

  it("maxAnio es no nulo y al menos el año existente probado", async () => {
    const max = await maxAnio();
    expect(max).not.toBeNull();
    expect(max as number).toBeGreaterThanOrEqual(anioExistente);
  });

  it("resolveYear(añoExistente, false) devuelve el año mismo", async () => {
    await expect(existeAnio(anioExistente)).resolves.toBe(true);
    expect(await resolveYear(anioExistente, false)).toBe(anioExistente);
  });

  it("resolveYear(null, true) resuelve a maxAnio() (sin año fijo, FR-011)", async () => {
    const max = await maxAnio();
    const resolved = await resolveYear(null, true);
    expect(resolved).not.toBeNull();
    expect(resolved).toBe(max);
  });

  it("resolveYear(9999, false) devuelve null para un año inexistente", async () => {
    await expect(existeAnio(9999)).resolves.toBe(false);
    expect(await resolveYear(9999, false)).toBeNull();
  });

  it("cargoElegidoEnAnio coincide con las columnas crudas de la fila del año probado", async () => {
    const cargos: CargoLocal[] = ["intendente", "concejales", "consejeros_escolares"];
    const esperado: Record<CargoLocal, boolean> = {
      intendente: filaCargos.elige_intendente === 1,
      concejales: filaCargos.cantidad_concejales !== null,
      consejeros_escolares: filaCargos.cantidad_consejeros !== null,
    };
    for (const cargo of cargos) {
      expect(await cargoElegidoEnAnio(cargo, anioExistente)).toBe(esperado[cargo]);
    }
  });

  it("cargoElegidoEnAnio devuelve false para un año inexistente", async () => {
    expect(await cargoElegidoEnAnio("intendente", anioInexistente)).toBe(false);
    expect(await cargoElegidoEnAnio("concejales", anioInexistente)).toBe(false);
    expect(await cargoElegidoEnAnio("consejeros_escolares", anioInexistente)).toBe(false);
  });
});
