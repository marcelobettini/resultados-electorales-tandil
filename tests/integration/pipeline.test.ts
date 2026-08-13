import { beforeAll, describe, expect, it } from "vitest";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { renderRespuesta } from "@/lib/respuestas/render";
import type { IntentoConsulta } from "@/lib/types";

interface AnioRow extends RowDataPacket {
  anio: number;
}

interface EleccionRow extends RowDataPacket {
  id: number;
  total_votos: number | null;
}

interface AgrupacionRow extends RowDataPacket {
  nombre: string;
  votos: number | null;
}

interface MaxAnioRow extends RowDataPacket {
  maxAnio: number;
}

let maxAnio: number;
let primer2001: AgrupacionRow;
let segundo2001: AgrupacionRow;
let totalVotos2001: number | null;
let anioSinIntendente: number | null;

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

beforeAll(async () => {
  const [maxRows] = await db.query<MaxAnioRow[]>("SELECT MAX(anio) AS maxAnio FROM elecciones");
  maxAnio = maxRows[0].maxAnio;

  const [eleccion2001] = await db.query<EleccionRow[]>(
    "SELECT id, total_votos FROM elecciones WHERE anio = 2001"
  );
  if (eleccion2001.length === 0) {
    throw new Error("Fixture inválida: no existe la elección de 2001 en la BD local.");
  }
  totalVotos2001 = eleccion2001[0].total_votos;

  const [top2001] = await db.query<AgrupacionRow[]>(
    "SELECT nombre, votos FROM agrupaciones WHERE eleccion_id = ? ORDER BY votos DESC LIMIT 2",
    [eleccion2001[0].id]
  );
  if (top2001.length < 2) {
    throw new Error("Fixture inválida: la elección de 2001 no tiene al menos 2 agrupaciones.");
  }
  [primer2001, segundo2001] = top2001;

  const [sinIntendente] = await db.query<AnioRow[]>(
    "SELECT anio FROM elecciones WHERE elige_intendente = 0 ORDER BY anio LIMIT 1"
  );
  anioSinIntendente = sinIntendente[0]?.anio ?? null;
});

describe("pipeline pregunta → intento → consulta BD real → respuesta", () => {
  it("T014-A: año explícito 2001, diferencia_primero_segundo devuelve respuesta con cifras de la base", async () => {
    const resp = await renderRespuesta(
      intento({
        categoria: "diferencia_primero_segundo",
        cargo: "intendente",
        anio: 2001,
      })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion).not.toBeNull();
    expect(resp.interpretacion?.anio).toBe(2001);
    expect(typeof resp.interpretacion?.anio).toBe("number");
    expect(resp.interpretacion?.categoria).toBe("diferencia_primero_segundo");
    expect(resp.texto).toContain(formatNumber(primer2001.votos));
    expect(resp.texto).toContain(formatNumber(segundo2001.votos));
    expect(resp.texto).toContain("2001");
    expect(resp.texto).toContain("Interpreté:");

    if (totalVotos2001 !== null) {
      expect(totalVotos2001).toBeGreaterThanOrEqual(primer2001.votos ?? 0);
    }
  });

  it("T014-B: última elección resuelve al año más reciente con datos y sus cifras", async () => {
    const resp = await renderRespuesta(
      intento({ categoria: "ganador_eleccion", es_ultima_eleccion: true })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion).not.toBeNull();
    expect(resp.interpretacion?.anio).toBe(maxAnio);
    expect(typeof resp.interpretacion?.anio).toBe("number");
    expect(resp.interpretacion?.categoria).toBe("ganador_eleccion");
    expect(resp.texto).toContain(String(maxAnio));
    expect(resp.texto).toContain("Interpreté:");
  });

  it("T014-C: año inexistente (1990) devuelve sin_datos", async () => {
    expect(maxAnio).toBeGreaterThan(1990);

    const resp = await renderRespuesta(
      intento({ categoria: "ganador_eleccion", anio: 1990 })
    );

    expect(resp.tipo).toBe("sin_datos");
  });

  it.skipIf(anioSinIntendente === null)(
    "T014-D: año sin elección de intendente devuelve sin_datos para ganador_intendencia",
    async () => {
      const resp = await renderRespuesta(
        intento({
          categoria: "ganador_intendencia",
          cargo: "intendente",
          anio: anioSinIntendente as number,
        })
      );

      expect(resp.tipo).toBe("sin_datos");
    }
  );
});
