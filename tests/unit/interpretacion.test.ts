import { describe, expect, it } from "vitest";
import {
  CATEGORIAS_IMPLEMENTADAS,
  TAXONOMY,
  esCategoria,
  getCategoria,
  nombreLegible,
} from "@/lib/interpretacion/taxonomy";
import {
  INTENT_JSON_SCHEMA,
  buildIntentResponseFormat,
} from "@/lib/interpretacion/intent-schema";
import { parseIntento, validateIntento } from "@/lib/interpretacion/validate-intent";
import type { CategoriaId, IntentoConsulta } from "@/lib/types";

const CATEGORIA_IDS: readonly CategoriaId[] = [
  "ganador_eleccion",
  "ganador_intendencia",
  "diferencia_primero_segundo",
  "ranking_top_n",
  "totales_eleccion",
  "bancas_por_partido",
  "personas_electas_cargo",
  "serie_total_votos",
  "participacion",
  "votos_agrupacion",
  "participacion_agrupacion",
  "serie_agrupacion",
  "historial_persona",
];

function baseIntento(): Record<string, unknown> {
  return {
    valido: true,
    categoria: "ganador_eleccion",
    cargo: "intendente",
    anio: 1991,
    es_ultima_eleccion: false,
    limite: null,
    agrupacion: null,
    persona: null,
    motivo_rechazo: null,
  };
}

describe("taxonomy", () => {
  it("TAXONOMY tiene 13 entradas, una por CategoriaId, todas implementadas", () => {
    expect(TAXONOMY).toHaveLength(13);
    expect(TAXONOMY.map((c) => c.id).sort()).toEqual([...CATEGORIA_IDS].sort());

    const implementadas = TAXONOMY.filter((c) => c.implemented);
    expect(implementadas).toHaveLength(13);
    expect(TAXONOMY.filter((c) => !c.implemented)).toEqual([]);
  });

  it("CATEGORIAS_IMPLEMENTADAS coincide con las 13 ids implementadas", () => {
    const idsImplementadas = TAXONOMY.filter((c) => c.implemented).map((c) => c.id);
    expect(CATEGORIAS_IMPLEMENTADAS).toEqual(idsImplementadas);
    expect(CATEGORIAS_IMPLEMENTADAS).toHaveLength(13);
  });

  it("esCategoria(ganador_eleccion) es true y estrecha el tipo; bogus es false", () => {
    expect(esCategoria("ganador_eleccion")).toBe(true);
    expect(esCategoria("bogus")).toBe(false);

    const id: string = "ganador_eleccion";
    if (esCategoria(id)) {
      expect(getCategoria(id).id).toBe("ganador_eleccion");
    }
  });

  it("getCategoria lanza en ids desconocidos y nombreLegible devuelve el string en español", () => {
    expect(() => getCategoria("bogus" as CategoriaId)).toThrow();
    expect(nombreLegible("ganador_eleccion")).toBe("ganador de la elección");
    expect(nombreLegible("participacion")).toBe("porcentaje de participación");
  });

  it("los 13 nombreLegible son únicos y no vacíos", () => {
    const nombres = TAXONOMY.map((c) => c.nombreLegible);
    expect(new Set(nombres).size).toBe(13);
    for (const nombre of nombres) {
      expect(nombre.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("intent-schema", () => {
  it("INTENT_JSON_SCHEMA es objeto con additionalProperties false y required exacto", () => {
    expect(INTENT_JSON_SCHEMA.type).toBe("object");
    expect(INTENT_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(INTENT_JSON_SCHEMA.required).toEqual([
      "valido",
      "categoria",
      "cargo",
      "anio",
      "es_ultima_eleccion",
      "limite",
      "agrupacion",
      "persona",
      "motivo_rechazo",
    ]);
  });

  it("el enum de categoria tiene 13 entradas y coincide con los 13 CategoriaId", () => {
    const enumCategorias = INTENT_JSON_SCHEMA.properties.categoria.enum;
    expect(enumCategorias).toHaveLength(13);
    expect([...enumCategorias].sort()).toEqual([...CATEGORIA_IDS].sort());
  });

  it("cargo tiene 3 entradas y motivo_rechazo 5 entradas", () => {
    expect(INTENT_JSON_SCHEMA.properties.cargo.enum).toEqual([
      "intendente",
      "concejales",
      "consejeros_escolares",
    ]);
    expect(INTENT_JSON_SCHEMA.properties.motivo_rechazo.enum).toEqual([
      "no_entendida",
      "ambito_no_local",
      "paso",
      "cargo_no_local",
      "comparacion_partido_entre_anios",
    ]);
  });

  it("anio y limite son {type:[integer,null]}; cargo y motivo_rechazo {type:[string,null]}", () => {
    expect(INTENT_JSON_SCHEMA.properties.anio.type).toEqual(["integer", "null"]);
    expect(INTENT_JSON_SCHEMA.properties.limite.type).toEqual(["integer", "null"]);
    expect(INTENT_JSON_SCHEMA.properties.cargo.type).toEqual(["string", "null"]);
    expect(INTENT_JSON_SCHEMA.properties.motivo_rechazo.type).toEqual(["string", "null"]);
  });

  it("buildIntentResponseFormat devuelve el formato json_schema estricto", () => {
    expect(buildIntentResponseFormat()).toEqual({
      type: "json_schema",
      json_schema: {
        name: "intento_consulta",
        strict: true,
        schema: INTENT_JSON_SCHEMA,
      },
    });
  });
});

describe("parseIntento", () => {
  it("devuelve no_entendida para raw que no es objeto", () => {
    expect(parseIntento(null)).toEqual({ ok: false, motivo: "no_entendida" });
    expect(parseIntento("texto")).toEqual({ ok: false, motivo: "no_entendida" });
    expect(parseIntento([1, 2])).toEqual({ ok: false, motivo: "no_entendida" });
    expect(parseIntento(42)).toEqual({ ok: false, motivo: "no_entendida" });
    expect(parseIntento(true)).toEqual({ ok: false, motivo: "no_entendida" });
  });

  it("acepta un intento valido con categoria conocida, anio 1991, cargo intendente y limite null", () => {
    const result = parseIntento(baseIntento());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intento).toEqual({
        valido: true,
        categoria: "ganador_eleccion",
        cargo: "intendente",
        anio: 1991,
        es_ultima_eleccion: false,
        limite: null,
        agrupacion: null,
        persona: null,
        motivo_rechazo: null,
      });
    }
  });

  it("rechaza categoria desconocida", () => {
    expect(parseIntento({ ...baseIntento(), categoria: "foo" })).toEqual({
      ok: false,
      motivo: "no_entendida",
    });
  });

  it("rechaza anio fuera del rango 1960-2100", () => {
    expect(parseIntento({ ...baseIntento(), anio: 1950 })).toEqual({
      ok: false,
      motivo: "no_entendida",
    });
    expect(parseIntento({ ...baseIntento(), anio: 2101 })).toEqual({
      ok: false,
      motivo: "no_entendida",
    });
  });

  it("rechaza anio presente junto con es_ultima_eleccion true", () => {
    expect(
      parseIntento({ ...baseIntento(), es_ultima_eleccion: true })
    ).toEqual({ ok: false, motivo: "no_entendida" });
  });

  it("rechaza limite fuera del rango 1-20", () => {
    expect(parseIntento({ ...baseIntento(), limite: 50 })).toEqual({
      ok: false,
      motivo: "no_entendida",
    });
    expect(parseIntento({ ...baseIntento(), limite: 0 })).toEqual({
      ok: false,
      motivo: "no_entendida",
    });
  });

  it("rechaza cargo no local (presidente)", () => {
    expect(parseIntento({ ...baseIntento(), cargo: "presidente" })).toEqual({
      ok: false,
      motivo: "no_entendida",
    });
  });

  it("acepta valido:true con motivo_rechazo espurio normalizándolo a null", () => {
    const result = parseIntento({
      ...baseIntento(),
      motivo_rechazo: "no_entendida",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intento.motivo_rechazo).toBeNull();
    }
  });

  it("normaliza cargo a null para historial_persona (el historial siempre es completo por cargo)", () => {
    const result = parseIntento({
      ...baseIntento(),
      categoria: "historial_persona",
      cargo: "intendente",
      anio: null,
      persona: "Miguel Lunghi",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intento.cargo).toBeNull();
      expect(result.intento.persona).toBe("Miguel Lunghi");
    }
  });

  it("acepta valido:false con motivo_rechazo valido (paso) pasándolo tal cual", () => {
    const result = parseIntento({
      valido: false,
      categoria: null,
      cargo: null,
      anio: null,
      es_ultima_eleccion: false,
      limite: null,
      agrupacion: null,
      persona: null,
      motivo_rechazo: "paso",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intento.motivo_rechazo).toBe("paso");
      expect(result.intento.valido).toBe(false);
    }
  });

  it("rechaza valido:false con motivo_rechazo null", () => {
    expect(
      parseIntento({
        ...baseIntento(),
        valido: false,
        categoria: null,
        cargo: null,
        anio: null,
        es_ultima_eleccion: false,
        limite: null,
        motivo_rechazo: null,
      })
    ).toEqual({ ok: false, motivo: "no_entendida" });
  });

  it("rechaza valido que no es booleano (string 'true')", () => {
    expect(parseIntento({ ...baseIntento(), valido: "true" })).toEqual({
      ok: false,
      motivo: "no_entendida",
    });
  });
});

describe("validateIntento", () => {
  it("devuelve true para un intento válido y false para uno inválido", () => {
    const valido: IntentoConsulta = {
      valido: true,
      categoria: "ganador_eleccion",
      cargo: "intendente",
      anio: 1991,
      es_ultima_eleccion: false,
      limite: null,
      agrupacion: null,
      persona: null,
      motivo_rechazo: null,
    };
    const invalido: IntentoConsulta = {
      ...valido,
      anio: 1950,
    };

    expect(validateIntento(valido)).toBe(true);
    expect(validateIntento(invalido)).toBe(false);
  });
});
