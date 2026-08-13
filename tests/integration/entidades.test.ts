import { beforeAll, describe, expect, it } from "vitest";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { renderRespuesta } from "@/lib/respuestas/render";
import type { IntentoConsulta } from "@/lib/types";

interface AgrupacionRow extends RowDataPacket {
  nombre: string;
  anio: number;
  votos: number | null;
}

interface PersonaRow extends RowDataPacket {
  nombre_completo: string;
  anio: number;
}

let agrupacion2001: AgrupacionRow;
let personaConHistorial: PersonaRow;
let anioPadron: number | null;

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

function nombreExacto(nombre: string): string {
  return nombre.replace(/\s+/g, " ").trim();
}

beforeAll(async () => {
  const [agrupaciones] = await db.query<AgrupacionRow[]>(
    `SELECT a.nombre, e.anio, a.votos
     FROM agrupaciones a
     JOIN elecciones e ON e.id = a.eleccion_id
     WHERE e.anio = 2001 AND a.votos IS NOT NULL
     ORDER BY a.votos DESC
     LIMIT 1`
  );
  if (agrupaciones.length === 0) {
    throw new Error("Fixture inválida: no hay agrupaciones con votos en 2001.");
  }
  agrupacion2001 = agrupaciones[0];

  const [personas] = await db.query<PersonaRow[]>(
    `SELECT el.nombre_completo, e.anio
     FROM electos el
     JOIN elecciones e ON e.id = el.eleccion_id
     ORDER BY e.anio DESC
     LIMIT 1`
  );
  if (personas.length === 0) {
    throw new Error("Fixture inválida: no hay personas electas.");
  }
  personaConHistorial = personas[0];

  const [conPadron] = await db.query<RowDataPacket[]>(
    "SELECT anio FROM elecciones WHERE electores_habilitados IS NOT NULL ORDER BY anio LIMIT 1"
  );
  anioPadron = (conPadron[0] as { anio?: number } | undefined)?.anio ?? null;
});

describe("categorías de entidad contra la BD real", () => {
  it("votos_agrupacion devuelve los votos reales de una agrupación en un año", async () => {
    const consulta = nombreExacto(agrupacion2001.nombre);
    const resp = await renderRespuesta(
      intento({ categoria: "votos_agrupacion", anio: 2001, agrupacion: consulta })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion?.categoria).toBe("votos_agrupacion");
    expect(resp.interpretacion?.anio).toBe(2001);
    expect(resp.texto).toContain(formatNumber(agrupacion2001.votos));
    expect(resp.texto).toContain("2001");
  });

  it("participacion_agrupacion confirma la participación de una agrupación en un año", async () => {
    const consulta = nombreExacto(agrupacion2001.nombre);
    const resp = await renderRespuesta(
      intento({ categoria: "participacion_agrupacion", anio: 2001, agrupacion: consulta })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.texto).toMatch(/Sí, .* participó/i);
  });

  it("participacion_agrupacion con agrupación inexistente responde que no participó", async () => {
    const resp = await renderRespuesta(
      intento({
        categoria: "participacion_agrupacion",
        anio: 2001,
        agrupacion: "agrupacion inexistente 99",
      })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.texto).toMatch(/No, .* no aparece/i);
  });

  it("serie_agrupacion devuelve el historial de la agrupación sin año", async () => {
    const consulta = nombreExacto(agrupacion2001.nombre);
    const resp = await renderRespuesta(
      intento({ categoria: "serie_agrupacion", agrupacion: consulta })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion?.categoria).toBe("serie_agrupacion");
    expect(resp.texto).toContain("participó en");
  });

  it("historial_persona devuelve los cargos en los que resultó electa una persona", async () => {
    const apellido = personaConHistorial.nombre_completo.split(",")[0] ?? personaConHistorial.nombre_completo;
    const resp = await renderRespuesta(
      intento({ categoria: "historial_persona", persona: apellido })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion?.categoria).toBe("historial_persona");
    expect(resp.texto).toContain("resultó electo");
    expect(resp.texto).toContain(String(personaConHistorial.anio));
  });

  it("historial_persona sin cargo muestra el desglose por cargo (Lunghi fue concejal y luego intendente)", async () => {
    const resp = await renderRespuesta(
      intento({ categoria: "historial_persona", persona: "Miguel Lunghi" })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.texto).toContain("intendente");
    expect(resp.texto).toContain("concejal");
    expect(resp.texto).toContain("1987");
    expect(resp.texto).toContain("2003");
  });

  it("historial_persona con apellido ambiguo lista todos los candidatos y sus cargos", async () => {
    const resp = await renderRespuesta(
      intento({ categoria: "historial_persona", persona: "Lunghi" })
    );

    expect(resp.tipo).toBe("no_entendida");
    expect(resp.interpretacion?.categoria).toBe("historial_persona");
    expect(resp.texto).toContain("«Lunghi»");
    expect(resp.texto).toContain("LUNGHI, José Emilio");
    expect(resp.texto).toContain("LUNGHI, Miguel Angel");
    expect(resp.texto).toContain("LUNGHI, Jose Luis");
    expect(resp.texto).toContain("LUNGHI, Sergio Luis");
    expect(resp.texto).toContain("¿A cuál te referís?");
  });

  it("historial_persona ignora el cargo del intento y responde el historial completo", async () => {
    const resp = await renderRespuesta(
      intento({ categoria: "historial_persona", cargo: "intendente", persona: "Miguel Lunghi" })
    );

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion?.categoria).toBe("historial_persona");
    expect(resp.texto).toContain("intendente");
    expect(resp.texto).toContain("concejal");
    expect(resp.texto).toContain("1987");
    expect(resp.texto).toContain("2003");
  });

  it("historial_persona con apellido ambiguo ignora el cargo y lista todos los candidatos con su historial", async () => {
    const resp = await renderRespuesta(
      intento({ categoria: "historial_persona", cargo: "intendente", persona: "Lunghi" })
    );

    expect(resp.tipo).toBe("no_entendida");
    expect(resp.texto).toContain("LUNGHI, José Emilio");
    expect(resp.texto).toContain("LUNGHI, Miguel Angel");
    expect(resp.texto).toContain("LUNGHI, Jose Luis");
    expect(resp.texto).toContain("LUNGHI, Sergio Luis");
  });

  it.skipIf(anioPadron === null)(
    "participacion devuelve el porcentaje real sobre el padrón",
    async () => {
      const resp = await renderRespuesta(
        intento({ categoria: "participacion", anio: anioPadron as number })
      );

      expect(resp.tipo).toBe("respuesta");
      expect(resp.interpretacion?.categoria).toBe("participacion");
      expect(resp.texto).toContain("padrón");
      expect(resp.texto).toMatch(/%\s*del padrón/);
    }
  );

  it("serie_total_votos devuelve la serie sin resolver año", async () => {
    const resp = await renderRespuesta(intento({ categoria: "serie_total_votos" }));

    expect(resp.tipo).toBe("respuesta");
    expect(resp.interpretacion?.categoria).toBe("serie_total_votos");
    expect(resp.texto).toContain("Serie del total de votos");
  });
});
