import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { renderRespuesta } from "@/lib/respuestas/render";
import type { IntentoConsulta } from "@/lib/types";

// Nota: este es el ÚNICO test que escribe en la BD (la feature es read-only, FR-004/FR-011).
// Escribe solo una fila propia (anio 9999) y garantiza su borrado en afterAll (try/finally),
// para que una segunda corrida no falle por uq_elecciones_anio ("Duplicate entry").
const ANIO_PRUEBA = 9999;

interface MaxAnioRow extends RowDataPacket {
  m: number | null;
}

interface ExisteAnioRow extends RowDataPacket {
  anio: number;
}

let maxAnio: number;

function intento(overrides: Partial<IntentoConsulta>): IntentoConsulta {
  return {
    valido: true,
    categoria: null,
    cargo: null,
    anio: null,
    es_ultima_eleccion: false,
    limite: null,
    motivo_rechazo: null,
    ...overrides,
  };
}

// Mismo intento en ambos tests: Test B reutiliza exactamente este objeto,
// probando que SC-010 no requiere cambio de código ni configuración.
const intentoUltima = intento({
  categoria: "ganador_eleccion",
  es_ultima_eleccion: true,
});

async function cuentaAnioPrueba(): Promise<number> {
  const [rows] = await db.query<ExisteAnioRow[]>(
    "SELECT anio FROM elecciones WHERE anio = ?",
    [ANIO_PRUEBA]
  );
  return rows.length;
}

beforeAll(async () => {
  const [maxRows] = await db.query<MaxAnioRow[]>(
    "SELECT MAX(anio) AS m FROM elecciones"
  );
  if (maxRows[0]?.m == null) {
    throw new Error("Fixture inválida: no hay elecciones en la BD local.");
  }
  maxAnio = maxRows[0].m;

  // Fixture previa: el anio de prueba no debe existir antes de insertarlo.
  expect(await cuentaAnioPrueba()).toBe(0);
});

afterAll(async () => {
  // Cleanup incondicional: corre incluso si Test B falla. try/finally garantiza
  // que la verificación de limpieza siempre se ejecuta.
  let deleteError: unknown = null;
  try {
    await db.query("DELETE FROM elecciones WHERE anio = ?", [ANIO_PRUEBA]);
  } catch (err) {
    deleteError = err;
  } finally {
    expect(await cuentaAnioPrueba()).toBe(0);
  }
  if (deleteError) {
    throw deleteError;
  }
});

describe("SC-010: última elección resuelve al año más reciente con datos", () => {
  it("T029-A: es_ultima_eleccion resuelve al año con MAX(anio) actual", async () => {
    const resp = await renderRespuesta(intentoUltima);

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion).not.toBeNull();
    expect(resp.interpretacion?.anio).toBe(maxAnio);
    expect(typeof resp.interpretacion?.anio).toBe("number");
    expect(resp.interpretacion?.categoria).toBe("ganador_eleccion");
    expect(resp.texto).toContain(String(maxAnio));
    expect(resp.texto).toContain("Interpreté:");
  });

  it("T029-B: tras insertar una elección nueva, el mismo intento resuelve al año nuevo sin cambio de código ni configuración", async () => {
    // autocommit por defecto del pool: la fila queda commiteada antes de la consulta de la app.
    await db.query(
      "INSERT INTO elecciones (anio, archivo_origen, elige_intendente) VALUES (?, ?, 0)",
      [ANIO_PRUEBA, "test-sc-010"]
    );

    const resp = await renderRespuesta(intentoUltima);

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion).not.toBeNull();
    expect(resp.interpretacion?.anio).toBe(ANIO_PRUEBA);
    expect(typeof resp.interpretacion?.anio).toBe("number");
    expect(resp.interpretacion?.categoria).toBe("ganador_eleccion");
    expect(resp.texto).toContain(String(ANIO_PRUEBA));
    expect(resp.texto).toContain("Interpreté:");
  });
});
