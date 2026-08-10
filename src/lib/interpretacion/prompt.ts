import { readFile } from "node:fs/promises";
import path from "node:path";

const REGLAS_PATH = path.join(process.cwd(), "docs/interpretacion/reglas.md");
const SCHEMA_PATH = path.join(process.cwd(), "db_schema.sql");

const CONTRATO =
  "Campos del JSON (todos obligatorios):\n" +
  '- "valido": boolean. true si la pregunta mapea a una categoría de la taxonomía; false si es confusa o fuera de alcance.\n' +
  '- "categoria": string | null. Enum exacto: ganador_eleccion, ganador_intendencia, diferencia_primero_segundo, ranking_top_n, totales_eleccion, bancas_por_partido, personas_electas_cargo, serie_total_votos, participacion, votos_agrupacion, participacion_agrupacion, serie_agrupacion, historial_persona.\n' +
  '- "cargo": string | null. Enum exacto: intendente, concejales, consejeros_escolares. Solo cargos locales de Tandil; null si la pregunta no pide explícitamente un cargo específico.\n' +
  '- "anio": integer | null. Año explícito de 4 dígitos (1960–2100) si la pregunta lo menciona; null en otro caso.\n' +
  '- "es_ultima_eleccion": boolean. true cuando la pregunta pide "la última/más reciente" o no menciona año; el servidor resuelve MAX(anio), nunca el intérprete.\n' +
  '- "limite": integer | null. Solo para ranking_top_n (1–10, el servidor usa 3 por defecto).\n' +
  '- "agrupacion": string | null. Solo para votos_agrupacion, participacion_agrupacion y serie_agrupacion: el nombre o fragmento de la agrupación tal como lo escribe el usuario; null en otro caso.\n' +
  '- "persona": string | null. Solo para historial_persona: el nombre EXACTO tal como lo escribe el usuario, sin completar ni inferir el nombre de pila (si el usuario escribe solo el apellido, poné solo ese apellido; el servidor detecta si hay varias personas con ese apellido y pide aclaración). Nunca inventes ni agregues partes del nombre; null en otro caso.\n' +
  '- "motivo_rechazo": string | null. Enum exacto: no_entendida, ambito_no_local, paso, cargo_no_local, comparacion_partido_entre_anios. IMPORTANTE: si valido=true, motivo_rechazo DEBE ser null (nunca otro valor); si valido=false, motivo_rechazo DEBE ser un valor no nulo.\n\n' +
  "El JSON debe ser estricto (structured outputs): incluir exactamente estos campos, sin propiedades adicionales (additionalProperties: false).";

const EJEMPLOS =
  'Ejemplo de intento válido: pregunta: "¿Quién ganó la elección en 2001?" → ' +
  '{"valido":true,"categoria":"ganador_eleccion","cargo":null,"anio":2001,"es_ultima_eleccion":false,"limite":null,"agrupacion":null,"persona":null,"motivo_rechazo":null}.\n' +
  'Ejemplo de agrupación: pregunta: "¿Cuántos votos sacó el Frente Renovador en 2015?" → ' +
  '{"valido":true,"categoria":"votos_agrupacion","cargo":null,"anio":2015,"es_ultima_eleccion":false,"limite":null,"agrupacion":"Frente Renovador","persona":null,"motivo_rechazo":null}.\n' +
  'Ejemplo de persona: pregunta: "¿En qué años fue electo Miguel Lunghi?" → ' +
  '{"valido":true,"categoria":"historial_persona","cargo":null,"anio":null,"es_ultima_eleccion":false,"limite":null,"agrupacion":null,"persona":"Miguel Lunghi","motivo_rechazo":null}.\n' +
  'Ejemplo de persona con cargo: pregunta: "¿Cuántas veces fue electo intendente Miguel Lunghi?" → ' +
  '{"valido":true,"categoria":"historial_persona","cargo":"intendente","anio":null,"es_ultima_eleccion":false,"limite":null,"agrupacion":null,"persona":"Miguel Lunghi","motivo_rechazo":null} (el servidor filtra el historial al cargo pedido).\n' +
  'Ejemplo de apellido ambiguo: pregunta: "¿Cuántas veces fue electo Lunghi?" → ' +
  '{"valido":true,"categoria":"historial_persona","cargo":null,"anio":null,"es_ultima_eleccion":false,"limite":null,"agrupacion":null,"persona":"Lunghi","motivo_rechazo":null} (persona debe ser "Lunghi", NO "Miguel Lunghi": el servidor detecta que hay varias personas con ese apellido y pide aclaración).\n' +
  'Ejemplo de rechazo: pregunta: "¿Cómo le fue a la UCR desde 1963?" → ' +
  '{"valido":false,"categoria":"ganador_eleccion","cargo":null,"anio":null,"es_ultima_eleccion":true,"limite":null,"agrupacion":null,"persona":null,"motivo_rechazo":"comparacion_partido_entre_anios"}.';

function bloque(titulo: string, contenido: string): string {
  return `## ${titulo}\n\n${contenido}`;
}

export async function buildSystemPrompt(): Promise<string> {
  const [reglas, esquema] = await Promise.all([
    readFile(REGLAS_PATH, "utf8"),
    readFile(SCHEMA_PATH, "utf8"),
  ]);

  return [
    "Sos un asistente que interpreta preguntas en lenguaje natural sobre los resultados electorales municipales de Tandil.",
    'Debés responder SIEMPRE con un único JSON estructurado que representa el intento de la consulta (nunca texto libre).',
    CONTRATO,
    "Solo interpretás, nunca respondés ni calculás cifras: el sistema ejecuta las consultas.",
    bloque("Reglas de interpretación", reglas),
    bloque("Esquema de la base de datos", esquema),
    bloque("Ejemplos", EJEMPLOS),
  ].join("\n\n");
}
