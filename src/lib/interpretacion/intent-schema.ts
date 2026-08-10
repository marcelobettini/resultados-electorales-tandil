export const INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    valido: { type: "boolean" },
    categoria: {
      type: ["string", "null"],
      enum: [
        "ganador_eleccion",
        "ganador_intendencia",
        "diferencia_primero_segundo",
        "ranking_top_n",
        "totales_eleccion",
        "bancas_por_partido",
        "personas_electas_cargo",
        "serie_total_votos",
        "participacion",
      ],
    },
    cargo: {
      type: ["string", "null"],
      enum: ["intendente", "concejales", "consejeros_escolares"],
    },
    anio: { type: ["integer", "null"] },
    es_ultima_eleccion: { type: "boolean" },
    limite: { type: ["integer", "null"] },
    motivo_rechazo: {
      type: ["string", "null"],
      enum: [
        "no_entendida",
        "ambito_no_local",
        "paso",
        "cargo_no_local",
        "comparacion_partido_entre_anios",
      ],
    },
  },
  required: [
    "valido",
    "categoria",
    "cargo",
    "anio",
    "es_ultima_eleccion",
    "limite",
    "motivo_rechazo",
  ],
  additionalProperties: false,
} as const;

export const INTENT_SCHEMA_NAME = "intento_consulta";

export function buildIntentResponseFormat(): {
  type: "json_schema";
  json_schema: { name: string; strict: true; schema: typeof INTENT_JSON_SCHEMA };
} {
  return {
    type: "json_schema",
    json_schema: {
      name: INTENT_SCHEMA_NAME,
      strict: true,
      schema: INTENT_JSON_SCHEMA,
    },
  };
}
