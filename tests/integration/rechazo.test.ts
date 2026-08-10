import { beforeAll, describe, expect, it } from "vitest";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { renderRespuesta } from "@/lib/respuestas/render";
import type { IntentoConsulta, Respuesta } from "@/lib/types";

interface AnioRow extends RowDataPacket {
  anio: number;
}

const CANDIDATOS_AUSENTES = [1990, 1987, 1985, 1992, 1988, 1989, 1991];

let aniosExistentes: number[];
let anioSinDatos: number;
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

function sinCifras(resp: Respuesta): void {
  expect(resp.texto).not.toMatch(/[0-9]/);
}

beforeAll(async () => {
  const [rows] = await db.query<AnioRow[]>("SELECT anio FROM elecciones ORDER BY anio");
  aniosExistentes = rows.map((fila) => fila.anio);
  const existentes = new Set(aniosExistentes);
  const candidato = CANDIDATOS_AUSENTES.find((anio) => !existentes.has(anio));
  anioSinDatos = candidato ?? Math.max(...aniosExistentes) + 1;

  const [sinIntendente] = await db.query<AnioRow[]>(
    "SELECT anio FROM elecciones WHERE elige_intendente = 0 ORDER BY anio LIMIT 1"
  );
  anioSinIntendente = sinIntendente[0]?.anio ?? null;
});

describe("T034 rechazos: batería fuera de alcance contra la BD real (seam renderRespuesta)", () => {
  it("cargo_no_local (gobernación) → fuera_de_alcance, menciona Tandil, sin cifras", async () => {
    const resp = await renderRespuesta(
      intento({ valido: false, motivo_rechazo: "cargo_no_local" })
    );

    expect(resp.tipo).toBe("fuera_de_alcance");
    expect(resp.interpretacion).toBeNull();
    expect(resp.texto).toContain("Tandil");
    sinCifras(resp);
  });

  it("paso (PASO/primarias) → fuera_de_alcance, sin cifras", async () => {
    const resp = await renderRespuesta(
      intento({ valido: false, motivo_rechazo: "paso" })
    );

    expect(resp.tipo).toBe("fuera_de_alcance");
    expect(resp.interpretacion).toBeNull();
    expect(resp.texto).toContain("PASO");
    sinCifras(resp);
  });

  it("ambito_no_local (Azul) → fuera_de_alcance, menciona Tandil, sin cifras", async () => {
    const resp = await renderRespuesta(
      intento({ valido: false, motivo_rechazo: "ambito_no_local" })
    );

    expect(resp.tipo).toBe("fuera_de_alcance");
    expect(resp.interpretacion).toBeNull();
    expect(resp.texto).toContain("Tandil");
    sinCifras(resp);
  });

  it("comparacion_partido_entre_anios (UCR desde 1963) → fuera_de_alcance, sin cifras", async () => {
    const resp = await renderRespuesta(
      intento({ valido: false, motivo_rechazo: "comparacion_partido_entre_anios" })
    );

    expect(resp.tipo).toBe("fuera_de_alcance");
    expect(resp.interpretacion).toBeNull();
    expect(resp.texto).toContain("No comparo");
    sinCifras(resp);
  });

  it("no_entendida (confusa) → no_entendida, sin cifras", async () => {
    const resp = await renderRespuesta(
      intento({ valido: false, motivo_rechazo: "no_entendida" })
    );

    expect(resp.tipo).toBe("no_entendida");
    expect(resp.interpretacion).toBeNull();
    expect(resp.texto).toContain("No entendí");
    sinCifras(resp);
  });

  it("participacion (reconocida, no implementada) → categoria_no_disponible, sin cifras", async () => {
    const resp = await renderRespuesta(
      intento({ categoria: "participacion", anio: 2011 })
    );

    expect(resp.tipo).toBe("categoria_no_disponible");
    expect(resp.interpretacion).toBeNull();
    expect(resp.texto).toContain("todavía no está disponible");
    sinCifras(resp);
  });

  it("año sin datos (1990) → sin_datos, sin cifras", async () => {
    expect(aniosExistentes).not.toContain(1990);

    const resp = await renderRespuesta(
      intento({ categoria: "ganador_eleccion", anio: anioSinDatos })
    );

    expect(resp.tipo).toBe("sin_datos");
    expect(resp.interpretacion).toBeNull();
    expect(resp.texto).toContain("No tengo datos");
    sinCifras(resp);
  });

  it.skipIf(anioSinIntendente === null)(
    "ganador_intendencia en año sin elección de intendente → sin_datos, sin cifras",
    async () => {
      const resp = await renderRespuesta(
        intento({
          categoria: "ganador_intendencia",
          cargo: "intendente",
          anio: anioSinIntendente as number,
        })
      );

      expect(resp.tipo).toBe("sin_datos");
      expect(resp.interpretacion).toBeNull();
      expect(resp.texto).toContain("No tengo datos");
      sinCifras(resp);
    }
  );
});
