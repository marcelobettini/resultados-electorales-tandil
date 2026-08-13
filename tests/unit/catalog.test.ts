import { describe, expect, it } from "vitest";
import { clampLimite, consultaSQL } from "@/lib/consultas/catalog";
import type { CargoLocal, CategoriaId, Interpretacion } from "@/lib/types";

const ANIO = 1991;

function interp(
  categoria: CategoriaId,
  overrides: Partial<Interpretacion> = {}
): Interpretacion {
  return {
    anio: ANIO,
    categoria,
    cargo: null,
    ...overrides,
  };
}

describe("clampLimite", () => {
  it("null devuelve el default 3", () => {
    expect(clampLimite(null)).toBe(3);
  });

  it("deja intactos los valores dentro del rango 1..10", () => {
    expect(clampLimite(1)).toBe(1);
    expect(clampLimite(5)).toBe(5);
    expect(clampLimite(10)).toBe(10);
  });

  it("clampa los valores fuera del rango 1..10", () => {
    expect(clampLimite(0)).toBe(1);
    expect(clampLimite(100)).toBe(10);
    expect(clampLimite(-5)).toBe(1);
  });

  it("3.7 devuelve un entero entre 1 y 10", () => {
    const resultado = clampLimite(3.7);
    expect(Number.isInteger(resultado)).toBe(true);
    expect(resultado).toBeGreaterThanOrEqual(1);
    expect(resultado).toBeLessThanOrEqual(10);
  });
});

const CATEGORIAS_CON_ANIO: Array<{ categoria: CategoriaId; cargo?: CargoLocal }> = [
  { categoria: "ganador_eleccion" },
  { categoria: "ganador_intendencia" },
  { categoria: "diferencia_primero_segundo" },
  { categoria: "ranking_top_n" },
  { categoria: "totales_eleccion" },
  { categoria: "bancas_por_partido", cargo: "concejales" },
  { categoria: "personas_electas_cargo", cargo: "intendente" },
  { categoria: "participacion" },
  { categoria: "votos_agrupacion" },
  { categoria: "participacion_agrupacion" },
];

describe("consultaSQL", () => {
  it.each(CATEGORIAS_CON_ANIO)(
    "$categoria genera un SELECT parametrizado filtrado por año sin interpolar valores",
    ({ categoria, cargo }) => {
      const { sql, params } = consultaSQL(interp(categoria, { cargo: cargo ?? null }), null);
      expect(sql).toMatch(/^\s*SELECT/i);
      expect(sql).toContain("?");
      expect(sql).toContain("elecciones.anio");
      expect(sql).not.toContain("${");
      expect(params).toContain(ANIO);
    }
  );

  it("ganador_eleccion consulta agrupaciones por votos DESC del año", () => {
    const { sql, params } = consultaSQL(interp("ganador_eleccion"), null);
    expect(sql).toContain("agrupaciones");
    expect(sql).toContain("votos DESC");
    expect(sql).not.toMatch(/LIMIT/i);
    expect(params).toEqual([ANIO]);
  });

  it("diferencia_primero_segundo consulta agrupaciones por votos DESC del año", () => {
    const { sql } = consultaSQL(interp("diferencia_primero_segundo"), null);
    expect(sql).toContain("agrupaciones");
    expect(sql).toContain("elecciones.anio");
    expect(sql).toContain("votos DESC");
  });

  it("ranking_top_n tiene LIMIT ? y parámetros [anio, limite]", () => {
    const { sql, params } = consultaSQL(interp("ranking_top_n", { anio: 2015 }), 3);
    expect(sql).toContain("agrupaciones");
    expect(sql).toContain("votos DESC");
    expect(sql).toMatch(/LIMIT\s*\?/i);
    expect(sql).not.toContain("${");
    expect(params).toEqual([2015, 3]);
  });

  it("ranking_top_n usa el límite clampado en los parámetros", () => {
    const { params } = consultaSQL(interp("ranking_top_n"), 0);
    expect(params).toEqual([ANIO, 1]);
  });

  it("ganador_intendencia filtra por obtuvo_intendencia = 1", () => {
    const { sql } = consultaSQL(interp("ganador_intendencia"), null);
    expect(sql).toContain("agrupaciones");
    expect(sql).toContain("obtuvo_intendencia = 1");
    expect(sql).toContain("elecciones.anio");
  });

  it("totales_eleccion selecciona las columnas de totales de elecciones", () => {
    const { sql } = consultaSQL(interp("totales_eleccion"), null);
    expect(sql).toContain("elecciones");
    for (const columna of [
      "total_votos",
      "votos_positivos",
      "votos_blanco",
      "votos_nulos",
      "electores_habilitados",
      "total_mesas",
    ]) {
      expect(sql).toContain(columna);
    }
  });

  it.each([
    ["concejales", "concejales_obtenidos"],
    ["consejeros_escolares", "consejeros_obtenidos"],
    ["intendente", "obtuvo_intendencia"],
  ] as const)(
    "bancas_por_partido con cargo %s usa la columna %s",
    (cargo, columna) => {
      const { sql } = consultaSQL(interp("bancas_por_partido", { cargo }), null);
      expect(sql).toContain("agrupaciones");
      expect(sql).toContain(columna);
      expect(sql).toContain("elecciones.anio");
    }
  );

  it("personas_electas_cargo une electos con agrupaciones para el nombre", () => {
    const { sql } = consultaSQL(
      interp("personas_electas_cargo", { cargo: "concejales" }),
      null
    );
    expect(sql).toContain("electos");
    expect(sql).toContain("agrupaciones");
    expect(sql).toContain("elecciones.anio");
  });

  it("serie_total_votos consulta elecciones por anio y total_votos sin filtro de año", () => {
    const { sql, params } = consultaSQL(interp("serie_total_votos"), null);
    expect(sql).toContain("elecciones");
    expect(sql).toContain("anio");
    expect(sql).toContain("total_votos");
    expect(sql).not.toContain("WHERE");
    expect(sql).not.toContain("?");
    expect(sql).not.toContain("${");
    expect(params).toEqual([]);
  });

  it("participacion consulta total_votos y electores_habilitados del año", () => {
    const { sql, params } = consultaSQL(interp("participacion"), null);
    expect(sql).toContain("elecciones");
    expect(sql).toContain("total_votos");
    expect(sql).toContain("electores_habilitados");
    expect(sql).toContain("elecciones.anio");
    expect(params).toEqual([ANIO]);
  });

  it("votos_agrupacion y participacion_agrupacion filtran por nombre con LIKE", () => {
    for (const categoria of ["votos_agrupacion", "participacion_agrupacion"] as const) {
      const { sql, params } = consultaSQL(
        interp(categoria, { agrupacion: "frente" }),
        null
      );
      expect(sql).toContain("agrupaciones");
      expect(sql).toContain("elecciones.anio");
      expect(sql).toContain("LIKE");
      expect(params).toEqual([ANIO, "%frente%"]);
    }
  });

  it("serie_agrupacion consulta todas las elecciones sin filtro de año", () => {
    const { sql, params } = consultaSQL(
      interp("serie_agrupacion", { agrupacion: "frente" }),
      null
    );
    expect(sql).toContain("agrupaciones");
    expect(sql).toContain("LIKE");
    expect(sql).not.toContain("WHERE elecciones.anio");
    expect(params).toEqual(["%frente%"]);
  });

  it("historial_persona consulta electos por nombre con LIKE sin filtro de año", () => {
    const { sql, params } = consultaSQL(
      interp("historial_persona", { persona: "gomez" }),
      null
    );
    expect(sql).toContain("electos");
    expect(sql).toContain("LIKE");
    expect(sql).not.toContain("WHERE elecciones.anio");
    expect(params).toEqual(["%gomez%"]);
  });

  it("devuelve cargo igual al cargo de entrada", () => {
    const casos: Array<[CategoriaId, CargoLocal]> = [
      ["ganador_eleccion", "intendente"],
      ["bancas_por_partido", "concejales"],
      ["personas_electas_cargo", "consejeros_escolares"],
    ];
    for (const [categoria, cargo] of casos) {
      expect(consultaSQL(interp(categoria, { cargo }), null).cargo).toBe(cargo);
    }
  });

  it("devuelve cargo null cuando la entrada trae cargo null", () => {
    expect(consultaSQL(interp("ganador_eleccion"), null).cargo).toBeNull();
  });
});
