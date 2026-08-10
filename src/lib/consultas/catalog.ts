import type { CargoLocal, CategoriaId, Interpretacion } from "@/lib/types";
import type { TemplateData } from "@/lib/respuestas/templates";

export interface ConsultaSQL {
  categoria: CategoriaId;
  cargo: CargoLocal | null;
  sql: string;
  params: Array<string | number>;
}

const LIMITE_DEFAULT = 3;
const LIMITE_MIN = 1;
const LIMITE_MAX = 10;

export function clampLimite(limite: number | null): number {
  if (limite === null) return LIMITE_DEFAULT;
  const entero = Math.round(limite);
  return Math.min(LIMITE_MAX, Math.max(LIMITE_MIN, entero));
}

const BANCA_COLUMN: Record<CargoLocal, string> = {
  intendente: "obtuvo_intendencia",
  concejales: "concejales_obtenidos",
  consejeros_escolares: "consejeros_obtenidos",
};

const CARGO_ENUM: Record<CargoLocal, "INTENDENTE" | "CONCEJAL" | "CONSEJERO_ESCOLAR"> = {
  intendente: "INTENDENTE",
  concejales: "CONCEJAL",
  consejeros_escolares: "CONSEJERO_ESCOLAR",
};

function requerirCargo(cargo: CargoLocal | null, categoria: CategoriaId): CargoLocal {
  if (cargo === null) {
    throw new Error(`la categoría ${categoria} requiere un cargo`);
  }
  return cargo;
}

export function consultaSQL(interp: Interpretacion, limite: number | null): ConsultaSQL {
  const { anio, categoria, cargo } = interp;
  switch (categoria) {
    case "ganador_eleccion":
      return {
        categoria,
        cargo,
        sql: `SELECT agrupaciones.nombre, agrupaciones.votos, agrupaciones.porcentaje
     FROM agrupaciones
     JOIN elecciones ON elecciones.id = agrupaciones.eleccion_id
     WHERE elecciones.anio = ?
     ORDER BY agrupaciones.votos IS NULL ASC, agrupaciones.votos DESC`,
        params: [anio],
      };
    case "ganador_intendencia":
      return {
        categoria,
        cargo,
        sql: `SELECT agrupaciones.nombre, agrupaciones.votos, agrupaciones.porcentaje
     FROM agrupaciones
     JOIN elecciones ON elecciones.id = agrupaciones.eleccion_id
     WHERE elecciones.anio = ? AND agrupaciones.obtuvo_intendencia = 1
     ORDER BY agrupaciones.votos IS NULL ASC, agrupaciones.votos DESC`,
        params: [anio],
      };
    case "diferencia_primero_segundo":
      return {
        categoria,
        cargo,
        sql: `SELECT agrupaciones.nombre, agrupaciones.votos
     FROM agrupaciones
     JOIN elecciones ON elecciones.id = agrupaciones.eleccion_id
     WHERE elecciones.anio = ?
     ORDER BY agrupaciones.votos IS NULL ASC, agrupaciones.votos DESC
     LIMIT 2`,
        params: [anio],
      };
    case "ranking_top_n":
      return {
        categoria,
        cargo,
        sql: `SELECT agrupaciones.nombre, agrupaciones.votos
     FROM agrupaciones
     JOIN elecciones ON elecciones.id = agrupaciones.eleccion_id
     WHERE elecciones.anio = ?
     ORDER BY agrupaciones.votos IS NULL ASC, agrupaciones.votos DESC
     LIMIT ?`,
        params: [anio, clampLimite(limite)],
      };
    case "totales_eleccion":
      return {
        categoria,
        cargo,
        sql: `SELECT total_votos, votos_positivos, votos_blanco, votos_nulos,
       electores_habilitados, total_mesas
     FROM elecciones
     WHERE elecciones.anio = ?`,
        params: [anio],
      };
    case "bancas_por_partido": {
      const cargoResuelto = requerirCargo(cargo, categoria);
      const columna = BANCA_COLUMN[cargoResuelto];
      return {
        categoria,
        cargo: cargoResuelto,
        sql: `SELECT agrupaciones.nombre AS partido, agrupaciones.${columna} AS bancas
     FROM agrupaciones
     JOIN elecciones ON elecciones.id = agrupaciones.eleccion_id
     WHERE elecciones.anio = ? AND agrupaciones.${columna} > 0
     ORDER BY bancas DESC, agrupaciones.nombre ASC`,
        params: [anio],
      };
    }
    case "personas_electas_cargo": {
      const cargoResuelto = requerirCargo(cargo, categoria);
      return {
        categoria,
        cargo: cargoResuelto,
        sql: `SELECT electos.nombre_completo, agrupaciones.nombre AS agrupacion
     FROM electos
     LEFT JOIN agrupaciones ON agrupaciones.id = electos.agrupacion_id
     JOIN elecciones ON elecciones.id = electos.eleccion_id
     WHERE elecciones.anio = ? AND electos.cargo = ? AND electos.condicion = 'TITULAR'
     ORDER BY electos.orden ASC, electos.nombre_completo ASC`,
        params: [anio, CARGO_ENUM[cargoResuelto]],
      };
    }
    case "serie_total_votos":
      return {
        categoria,
        cargo,
        sql: `SELECT anio, total_votos
     FROM elecciones
     ORDER BY anio ASC`,
        params: [],
      };
    case "participacion":
    default:
      throw new Error(`categoría no implementada: ${categoria}`);
  }
}

function datosBase(interp: Interpretacion): TemplateData {
  return {
    anio: interp.anio,
    cargo: interp.cargo,
    categoria: interp.categoria,
    ganador: null,
    segundo: null,
    diferencia: null,
    empate: false,
    ranking: [],
    totalesVotos: null,
    padron: null,
    votosPositivos: null,
    blancos: null,
    nulos: null,
    mesas: null,
    bancas: [],
    electos: [],
    serie: [],
  };
}

export async function resolverConsulta(
  interp: Interpretacion,
  limite: number | null
): Promise<{ datos: TemplateData; advertencia: string | null }> {
  const { anio, categoria, cargo } = interp;
  const datos = datosBase(interp);

  switch (categoria) {
    case "ganador_eleccion": {
      const mod = await import("@/lib/consultas/ganador");
      datos.ganador = await mod.ganadorEleccion(anio);
      break;
    }
    case "ganador_intendencia": {
      const mod = await import("@/lib/consultas/ganador");
      datos.ganador = await mod.ganadorIntendencia(anio);
      break;
    }
    case "diferencia_primero_segundo": {
      const mod = await import("@/lib/consultas/diferencia");
      const resultado = await mod.diferenciaPrimeroSegundo(anio);
      datos.ganador = resultado.primero
        ? { ...resultado.primero, porcentaje: null }
        : null;
      datos.segundo = resultado.segundo;
      datos.diferencia = resultado.diferencia;
      datos.empate = resultado.empate;
      break;
    }
    case "ranking_top_n": {
      const mod = await import("@/lib/consultas/ranking");
      datos.ranking = await mod.rankingTop(anio, clampLimite(limite));
      break;
    }
    case "totales_eleccion": {
      const mod = await import("@/lib/consultas/totales");
      const totales = await mod.totalesPorAnio(anio);
      datos.totalesVotos = totales?.votantes ?? null;
      datos.padron = totales?.padron ?? null;
      datos.votosPositivos = totales?.votosPositivos ?? null;
      datos.blancos = totales?.blancos ?? null;
      datos.nulos = totales?.nulos ?? null;
      datos.mesas = totales?.mesas ?? null;
      break;
    }
    case "bancas_por_partido": {
      const cargoResuelto = requerirCargo(cargo, categoria);
      const mod = await import("@/lib/consultas/bancas");
      datos.bancas = await mod.bancasPorCargo(anio, cargoResuelto);
      break;
    }
    case "personas_electas_cargo": {
      const cargoResuelto = requerirCargo(cargo, categoria);
      const mod = await import("@/lib/consultas/electos");
      datos.electos = await mod.electosPorCargo(anio, cargoResuelto);
      break;
    }
    case "serie_total_votos": {
      const mod = await import("@/lib/consultas/serie");
      datos.serie = await mod.serieTotalVotos();
      break;
    }
    case "participacion":
    default:
      throw new Error(`categoría no implementada: ${categoria}`);
  }

  const templatesPath = "@/lib/respuestas/templates";
  const { advertenciaTemplate } = (await import(templatesPath)) as {
    advertenciaTemplate: (datos: TemplateData) => string | null;
  };
  return { datos, advertencia: advertenciaTemplate(datos) };
}
