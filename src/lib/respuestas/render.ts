import { datosBase, resolverConsulta } from "@/lib/consultas/catalog";
import { serieAgrupacion, votosAgrupacion } from "@/lib/consultas/agrupaciones";
import { historialPersona } from "@/lib/consultas/personas";
import { participacionPorAnio } from "@/lib/consultas/totales";
import { serieTotalVotos } from "@/lib/consultas/serie";
import { cargoElegidoEnAnio, resolveYear } from "@/lib/consultas/years";
import { getCategoria } from "@/lib/interpretacion/taxonomy";
import {
  armarRespuesta,
  cargoNoElegidoTemplate,
  fueraDeAlcanceTemplate,
  noEntendidaTemplate,
  personaAmbiguaTemplate,
} from "@/lib/respuestas/templates";
import type {
  CargoLocal,
  CategoriaId,
  IntentoConsulta,
  Interpretacion,
  MotivoRechazo,
  Respuesta,
  TipoRespuesta,
} from "@/lib/types";

const MOTIVO_A_TIPO: Record<MotivoRechazo, TipoRespuesta> = {
  no_entendida: "no_entendida",
  ambito_no_local: "fuera_de_alcance",
  paso: "fuera_de_alcance",
  cargo_no_local: "fuera_de_alcance",
  comparacion_partido_entre_anios: "fuera_de_alcance",
};

const CATEGORIAS_CON_CARGO: ReadonlySet<CategoriaId> = new Set([
  "ganador_intendencia",
  "bancas_por_partido",
  "personas_electas_cargo",
]);

export async function renderRespuesta(intento: IntentoConsulta): Promise<Respuesta> {
  if (!intento.valido) {
    const motivo = intento.motivo_rechazo ?? "no_entendida";
    const tipo = MOTIVO_A_TIPO[motivo];
    const texto =
      tipo === "no_entendida" ? noEntendidaTemplate() : fueraDeAlcanceTemplate(motivo);
    return { tipo, texto, interpretacion: null, advertencia: null, desde_cache: false };
  }

  if (intento.categoria === null) {
    return armarRespuesta("no_entendida", null, null);
  }

  if (!getCategoria(intento.categoria).implemented) {
    return armarRespuesta("categoria_no_disponible", null, null);
  }

  switch (intento.categoria) {
    case "votos_agrupacion":
    case "participacion_agrupacion":
      return renderAgrupacionEnAnio(intento);
    case "serie_agrupacion":
      return renderSerieAgrupacion(intento);
    case "historial_persona":
      return renderHistorialPersona(intento);
    case "serie_total_votos":
      return renderSerieTotalVotos(intento);
    default:
      break;
  }

  const anio = await resolveYear(intento.anio, intento.es_ultima_eleccion);
  if (anio === null) {
    return armarRespuesta("sin_datos", null, null);
  }

  const interpretacion = interpretacionDeIntento(intento, anio);

  if (intento.categoria === "participacion") {
    return renderParticipacion(anio, intento);
  }

  const cargoConsulta = cargoDeCategoria(intento);

  if (
    cargoConsulta &&
    CATEGORIAS_CON_CARGO.has(intento.categoria) &&
    !(await cargoElegidoEnAnio(cargoConsulta, anio))
  ) {
    return {
      tipo: "sin_datos",
      texto: cargoNoElegidoTemplate(cargoConsulta, anio),
      interpretacion,
      advertencia: null,
      desde_cache: false,
    };
  }

  const { datos, advertencia } = await resolverConsulta(interpretacion, intento.limite);
  const respuesta = armarRespuesta("respuesta", datos, interpretacion);

  if (advertencia && !respuesta.advertencia) {
    return {
      ...respuesta,
      texto: `${respuesta.texto}\n\nAdvertencia: ${advertencia}`,
      advertencia,
    };
  }
  return respuesta;
}

function interpretacionDeIntento(intento: IntentoConsulta, anio: number): Interpretacion {
  return {
    anio,
    categoria: intento.categoria as CategoriaId,
    cargo: cargoDeCategoria(intento),
    agrupacion: intento.agrupacion,
    persona: intento.persona,
  };
}

function cargoDeCategoria(intento: IntentoConsulta): CargoLocal | null {
  if (intento.categoria === "ganador_intendencia") {
    return "intendente";
  }
  return CATEGORIAS_CON_CARGO.has(intento.categoria as CategoriaId) ? intento.cargo : null;
}

async function renderAgrupacionEnAnio(intento: IntentoConsulta): Promise<Respuesta> {
  const anio = await resolveYear(intento.anio, intento.es_ultima_eleccion);
  const interpretacion = interpretacionDeIntento(intento, anio ?? 0);

  if (anio === null) {
    return armarRespuesta("sin_datos", null, interpretacion);
  }

  const resultado = await votosAgrupacion(anio, intento.agrupacion ?? "");
  if (resultado.estado === "no_encontrada") {
    if (intento.categoria === "participacion_agrupacion") {
      return {
        tipo: "respuesta",
        texto: `No, «${intento.agrupacion}» no aparece en las elecciones de ${anio}.`,
        interpretacion,
        advertencia: null,
        desde_cache: false,
      };
    }
    return {
      tipo: "sin_datos",
      texto: `No encuentro «${intento.agrupacion}» en las elecciones de ${anio}: puede que no haya participado o que el nombre no sea exacto.`,
      interpretacion,
      advertencia: null,
      desde_cache: false,
    };
  }
  if (resultado.estado === "ambigua") {
    return {
      ...armarRespuesta("no_entendida", null, interpretacion),
      texto: `Hay varias agrupaciones con un nombre parecido a «${intento.agrupacion}» en ${anio}. Reformulá indicando el nombre exacto.`,
    };
  }

  const datos = datosBase(interpretacion);
  datos.agrupacion = resultado.nombre;
  datos.votosAgrupacion = { votos: resultado.votos, porcentaje: resultado.porcentaje };
  return armarRespuesta("respuesta", datos, interpretacion);
}

async function renderSerieAgrupacion(intento: IntentoConsulta): Promise<Respuesta> {
  const serie = await serieAgrupacion(intento.agrupacion ?? "");
  const interpretacion = interpretacionDeIntento(intento, intento.anio ?? 0);

  if (!serie) {
    return {
      ...armarRespuesta("sin_datos", null, interpretacion),
      texto: `No encuentro «${intento.agrupacion}» en ninguna elección cargada.`,
    };
  }

  let registros = serie.registros;
  if (intento.anio !== null && !intento.es_ultima_eleccion) {
    registros = registros.filter((registro) => registro.anio >= (intento.anio as number));
  }
  if (registros.length === 0) {
    return armarRespuesta("sin_datos", null, interpretacion);
  }

  const datos = datosBase(interpretacion);
  datos.agrupacion = registros[registros.length - 1].nombre;
  datos.serieAgrupacion = registros;
  return armarRespuesta("respuesta", datos, interpretacion);
}

async function renderHistorialPersona(intento: IntentoConsulta): Promise<Respuesta> {
  const historial = await historialPersona(intento.persona ?? "");
  const interpretacion = interpretacionDeIntento(intento, intento.anio ?? 0);

  if (historial.estado === "no_encontrada") {
    return {
      ...armarRespuesta("sin_datos", null, interpretacion),
      texto: `No encuentro a «${intento.persona}» en los registros de personas electas.`,
    };
  }
  if (historial.estado === "ambigua") {
    return {
      ...armarRespuesta("no_entendida", null, interpretacion),
      texto: personaAmbiguaTemplate(intento.persona ?? "", historial.candidatos ?? []),
    };
  }

  const datos = datosBase(interpretacion);
  datos.persona = historial.nombre;
  datos.historial = historial.registros;
  return armarRespuesta("respuesta", datos, interpretacion);
}

async function renderSerieTotalVotos(intento: IntentoConsulta): Promise<Respuesta> {
  const serie = await serieTotalVotos();
  const interpretacion = interpretacionDeIntento(intento, intento.anio ?? 0);

  if (serie.length === 0) {
    return armarRespuesta("sin_datos", null, interpretacion);
  }

  const datos = datosBase(interpretacion);
  datos.serie = serie;
  return armarRespuesta("respuesta", datos, interpretacion);
}

async function renderParticipacion(anio: number, intento: IntentoConsulta): Promise<Respuesta> {
  const interpretacion = interpretacionDeIntento(intento, anio);
  const participacion = await participacionPorAnio(anio);

  if (!participacion || participacion.padron === null) {
    return {
      ...armarRespuesta("sin_datos", null, interpretacion),
      texto: `No tengo el padrón de ${anio} para calcular la participación.`,
    };
  }

  const datos = datosBase(interpretacion);
  datos.totalesVotos = participacion.votantes;
  datos.padron = participacion.padron;
  datos.participacionDatos = participacion;
  return armarRespuesta("respuesta", datos, interpretacion);
}
