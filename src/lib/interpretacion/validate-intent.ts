import type {
  CargoLocal,
  CategoriaId,
  IntentoConsulta,
  MotivoRechazo,
} from "@/lib/types";

export type IntentoParseado =
  | { ok: true; intento: IntentoConsulta }
  | { ok: false; motivo: MotivoRechazo };

const ANIO_MIN = 1960;
const ANIO_MAX = 2100;
const LIMITE_MIN = 1;
const LIMITE_MAX = 20;

// taxonomy.ts se crea en paralelo; fallback a los enums de types.ts mientras no exista esCategoria.
const CATEGORIAS: readonly CategoriaId[] = [
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

const CATEGORIAS_CON_AGRUPACION: ReadonlySet<CategoriaId> = new Set([
  "votos_agrupacion",
  "participacion_agrupacion",
  "serie_agrupacion",
]);

const CATEGORIAS_CON_PERSONA: ReadonlySet<CategoriaId> = new Set([
  "historial_persona",
]);

const CARGOS: readonly CargoLocal[] = [
  "intendente",
  "concejales",
  "consejeros_escolares",
];

const MOTIVOS: readonly MotivoRechazo[] = [
  "no_entendida",
  "ambito_no_local",
  "paso",
  "cargo_no_local",
  "comparacion_partido_entre_anios",
];

function esCategoria(v: unknown): v is CategoriaId {
  return typeof v === "string" && (CATEGORIAS as readonly string[]).includes(v);
}

function esCargo(v: unknown): v is CargoLocal {
  return typeof v === "string" && (CARGOS as readonly string[]).includes(v);
}

function esMotivo(v: unknown): v is MotivoRechazo {
  return typeof v === "string" && (MOTIVOS as readonly string[]).includes(v);
}

function esEnteroEnRango(v: unknown, min: number, max: number): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

function esTextoONulo(v: unknown): boolean {
  return v === null || typeof v === "string";
}

function textoNoVacio(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function esEnteroONulo(v: unknown): boolean {
  return v === null || (typeof v === "number" && Number.isInteger(v));
}

function formaValida(r: object): boolean {
  const v = r as Record<string, unknown>;
  return (
    typeof v.valido === "boolean" &&
    typeof v.es_ultima_eleccion === "boolean" &&
    "categoria" in v &&
    esTextoONulo(v.categoria) &&
    "cargo" in v &&
    esTextoONulo(v.cargo) &&
    "anio" in v &&
    esEnteroONulo(v.anio) &&
    "limite" in v &&
    esEnteroONulo(v.limite) &&
    "agrupacion" in v &&
    esTextoONulo(v.agrupacion) &&
    "persona" in v &&
    esTextoONulo(v.persona) &&
    "motivo_rechazo" in v &&
    esTextoONulo(v.motivo_rechazo)
  );
}

function dominioValido(r: object): boolean {
  const v = r as Record<string, unknown>;
  if (v.valido === true) {
    return (
      esCategoria(v.categoria) &&
      (v.cargo === null || esCargo(v.cargo)) &&
      (v.anio === null || esEnteroEnRango(v.anio, ANIO_MIN, ANIO_MAX)) &&
      (v.anio === null || v.es_ultima_eleccion === false) &&
      (v.limite === null || esEnteroEnRango(v.limite, LIMITE_MIN, LIMITE_MAX))
    );
  }
  return esMotivo(v.motivo_rechazo);
}

function demotarPorFaltaDeParametro(intento: IntentoConsulta): IntentoConsulta | null {
  const requiereAgrupacion =
    intento.categoria !== null && CATEGORIAS_CON_AGRUPACION.has(intento.categoria);
  const requierePersona =
    intento.categoria !== null && CATEGORIAS_CON_PERSONA.has(intento.categoria);
  if (
    (requiereAgrupacion && !textoNoVacio(intento.agrupacion)) ||
    (requierePersona && !textoNoVacio(intento.persona))
  ) {
    return {
      valido: false,
      categoria: null,
      cargo: null,
      anio: null,
      es_ultima_eleccion: false,
      limite: null,
      agrupacion: null,
      persona: null,
      motivo_rechazo: "no_entendida",
    };
  }
  return null;
}

export function parseIntento(raw: unknown): IntentoParseado {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, motivo: "no_entendida" };
  }
  const r = raw as Record<string, unknown>;
  if (!formaValida(r)) {
    return { ok: false, motivo: "no_entendida" };
  }
  const intento = r as unknown as IntentoConsulta;
  if (intento.valido) {
    const demotado = demotarPorFaltaDeParametro(intento);
    if (demotado !== null) {
      return { ok: true, intento: demotado };
    }
    if (!dominioValido(r)) {
      return { ok: false, motivo: "no_entendida" };
    }
    intento.motivo_rechazo = null;
    if (!CATEGORIAS_CON_AGRUPACION.has(intento.categoria as CategoriaId)) {
      intento.agrupacion = null;
    }
    if (intento.categoria !== "historial_persona") {
      intento.persona = null;
    }
    if (intento.categoria === "historial_persona") {
      intento.cargo = null;
    }
    return { ok: true, intento };
  }
  if (!dominioValido(r)) {
    return { ok: false, motivo: "no_entendida" };
  }
  return { ok: true, intento };
}

export function validateIntento(intento: IntentoConsulta): boolean {
  if (typeof intento !== "object" || intento === null) return false;
  return formaValida(intento) && dominioValido(intento);
}
