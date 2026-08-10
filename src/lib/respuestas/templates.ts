import { formatNumber, formatPercentage } from "@/lib/format";
import { nombreLegible } from "@/lib/interpretacion/taxonomy";
import type {
  CargoLocal,
  CategoriaId,
  Interpretacion,
  MotivoRechazo,
  Respuesta,
} from "@/lib/types";
import { advertenciaTemplate } from "./warnings";

export { advertenciaTemplate };

export interface TemplateData {
  anio: number;
  cargo: CargoLocal | null;
  categoria: CategoriaId;
  ganador: { nombre: string; votos: number | null; porcentaje: number | null } | null;
  segundo: { nombre: string; votos: number | null } | null;
  diferencia: number | null;
  empate: boolean;
  ranking: Array<{ posicion: number; nombre: string; votos: number | null }>;
  totalesVotos: number | null;
  padron: number | null;
  votosPositivos: number | null;
  blancos: number | null;
  nulos: number | null;
  mesas: number | null;
  bancas: Array<{ partido: string; bancas: number }>;
  electos: Array<{ nombre: string; partido: string; cargo: CargoLocal }>;
  serie: Array<{ anio: number; votos: number | null }>;
  agrupacion?: string | null;
  persona?: string | null;
  votosAgrupacion?: { votos: number | null; porcentaje: number | null } | null;
  serieAgrupacion?: Array<{ anio: number; nombre: string; votos: number | null }> | null;
  historial?: Array<{ anio: number; cargo: string; condicion: string }> | null;
  participacionDatos?: {
    votantes: number | null;
    padron: number | null;
    porcentaje: number | null;
  } | null;
}

const CATEGORIAS_CON_CARGO_IMPLICITO: ReadonlySet<CategoriaId> = new Set([
  "ganador_intendencia",
]);

export function lineaInterpretacion(interp: Interpretacion): string {
  const cargo =
    interp.cargo && !CATEGORIAS_CON_CARGO_IMPLICITO.has(interp.categoria)
      ? ` de ${interp.cargo}`
      : "";
  const transversales = new Set<CategoriaId>([
    "serie_total_votos",
    "serie_agrupacion",
    "historial_persona",
  ]);
  if (transversales.has(interp.categoria)) {
    return `Interpreté: ${nombreLegible(interp.categoria)}${cargo}.`;
  }
  return `Interpreté: ${nombreLegible(interp.categoria)}${cargo} de ${interp.anio}.`;
}

const CARGO_NO_ELIGIDO: Record<CargoLocal, string> = {
  intendente: "no se eligió intendente",
  concejales: "no se eligieron concejales",
  consejeros_escolares: "no se eligieron consejeros escolares",
};

export function cargoNoElegidoTemplate(cargo: CargoLocal, anio: number): string {
  return `En ${anio} ${CARGO_NO_ELIGIDO[cargo]} en Tandil: fue una elección legislativa (solo se renovaron concejales y consejeros escolares).`;
}

export function ganadorTemplate(datos: TemplateData): string {
  const { anio, categoria, ganador } = datos;
  if (!ganador) {
    return `No se pudo determinar el ganador de ${anio}.`;
  }
  const alcance = categoria === "ganador_intendencia" ? "la intendencia" : "la elección";
  const votos =
    ganador.votos === null
      ? "votos no registrados"
      : `${formatNumber(ganador.votos)} votos`;
  const porcentaje =
    ganador.porcentaje === null ? "" : ` (${formatPercentage(ganador.porcentaje)})`;
  return `El ganador de ${alcance} de ${anio} fue «${ganador.nombre}» con ${votos}${porcentaje}.`;
}

export function diferenciaTemplate(datos: TemplateData): string {
  const { anio, ganador, segundo, diferencia, empate } = datos;
  if (empate || !segundo) {
    if (ganador) {
      return `En ${anio} hubo un empate en el primer puesto, con «${ganador.nombre}» entre las agrupaciones igualadas.`;
    }
    return `En ${anio} no se pudo calcular la diferencia entre el primero y el segundo.`;
  }
  const primerNombre = ganador ? ganador.nombre : "la primera agrupación";
  const primerVotos = ganador ? formatNumber(ganador.votos) : "sin dato";
  const resta =
    diferencia === null
      ? "sin dato registrado"
      : `${formatNumber(diferencia)} votos`;
  return `En ${anio} el primer puesto fue «${primerNombre}» con ${primerVotos} votos y el segundo «${segundo.nombre}» con ${formatNumber(segundo.votos)} votos. La diferencia fue de ${resta}.`;
}

export function rankingTemplate(datos: TemplateData): string {
  const { anio, ranking } = datos;
  if (ranking.length === 0) {
    return `En ${anio} no hay agrupaciones con votos registrados.`;
  }
  const lineas = ranking.map(
    (posicion) =>
      `${posicion.posicion}. «${posicion.nombre}» con ${formatNumber(posicion.votos)} votos`
  );
  return `En ${anio}, el ranking de agrupaciones fue:\n${lineas.join("\n")}`;
}

export function totalesTemplate(datos: TemplateData): string {
  const { anio, totalesVotos, padron, votosPositivos, blancos, nulos, mesas } = datos;
  const lineas = [
    `Votantes: ${formatNumber(totalesVotos)}`,
    `Padrón: ${formatNumber(padron)}`,
    `Votos válidos: ${formatNumber(votosPositivos)}`,
    `Blancos: ${formatNumber(blancos)}`,
    `Nulos: ${formatNumber(nulos)}`,
    `Mesas: ${formatNumber(mesas)}`,
  ];
  return `Totales de la elección de ${anio}:\n${lineas.join("\n")}`;
}

export function bancasTemplate(datos: TemplateData): string {
  const { anio, bancas } = datos;
  if (bancas.length === 0) {
    return `En ${anio} no hay bancas registradas para ese cargo.`;
  }
  const lineas = bancas.map((banca) => `«${banca.partido}»: ${banca.bancas} bancas`);
  return `Bancas por partido en ${anio}:\n${lineas.join("\n")}`;
}

export function electosTemplate(datos: TemplateData): string {
  const { anio, electos } = datos;
  if (electos.length === 0) {
    return `En ${anio} no hay personas electas registradas para ese cargo.`;
  }
  const lineas = electos.map((electo) => `- ${electo.nombre} (${electo.partido})`);
  return `Personas electas en ${anio}:\n${lineas.join("\n")}`;
}

export function serieTemplate(datos: TemplateData): string {
  const { serie } = datos;
  if (serie.length === 0) {
    return "No hay datos de la serie del total de votos por año.";
  }
  const lineas = serie.map((anio) => `${anio.anio}: ${formatNumber(anio.votos)} votos`);
  return `Serie del total de votos por año:\n${lineas.join("\n")}`;
}

export function votosAgrupacionTemplate(datos: TemplateData): string {
  const { anio, agrupacion, votosAgrupacion } = datos;
  if (!votosAgrupacion) {
    return `No hay datos de votos de «${agrupacion}» en ${anio}.`;
  }
  if (votosAgrupacion.votos === null) {
    return `«${agrupacion}» compitió en ${anio}, pero sus votos no están registrados.`;
  }
  const porcentaje =
    votosAgrupacion.porcentaje === null
      ? ""
      : ` (${formatPercentage(votosAgrupacion.porcentaje)})`;
  return `En ${anio}, «${agrupacion}» obtuvo ${formatNumber(votosAgrupacion.votos)} votos${porcentaje}.`;
}

export function participacionAgrupacionTemplate(datos: TemplateData): string {
  const { anio, agrupacion, votosAgrupacion } = datos;
  if (!votosAgrupacion) {
    return `Sí, «${agrupacion}» participó en las elecciones de ${anio}.`;
  }
  if (votosAgrupacion.votos === null) {
    return `Sí, «${agrupacion}» participó en las elecciones de ${anio}, aunque sus votos no están registrados.`;
  }
  return `Sí, «${agrupacion}» participó en las elecciones de ${anio} con ${formatNumber(votosAgrupacion.votos)} votos.`;
}

export function serieAgrupacionTemplate(datos: TemplateData): string {
  const { agrupacion, serieAgrupacion } = datos;
  if (!serieAgrupacion || serieAgrupacion.length === 0) {
    return `No hay registros de «${agrupacion}» en ninguna elección.`;
  }
  const anos = serieAgrupacion.map((registro) => registro.anio).join(", ");
  const lineas = serieAgrupacion.map(
    (registro) => `${registro.anio}: «${registro.nombre}» con ${formatNumber(registro.votos)} votos`
  );
  return `«${agrupacion}» participó en ${serieAgrupacion.length} elecciones (${anos}):\n${lineas.join("\n")}`;
}

const CARGO_SINGULAR: Record<CargoLocal, string> = {
  intendente: "intendente",
  concejales: "concejal",
  consejeros_escolares: "consejero escolar",
};

export function cargoSingular(cargo: CargoLocal): string {
  return CARGO_SINGULAR[cargo];
}

function listarAnios(anios: number[]): string {
  const partes = anios.map(String);
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

export function historialPersonaTemplate(datos: TemplateData): string {
  const { persona, historial, cargo } = datos;
  if (!historial || historial.length === 0) {
    return `No hay registros de elección de «${persona}».`;
  }
  if (cargo) {
    const anios = historial.map((registro) => registro.anio);
    const oportunidades = anios.length === 1 ? "oportunidad" : "oportunidades";
    return `«${persona}» resultó electo ${cargoSingular(cargo)} en ${
      anios.length
    } ${oportunidades}: ${listarAnios(anios)}.`;
  }
  const lineas = historial.map(
    (registro) => `${registro.anio}: ${registro.cargo} (${registro.condicion})`
  );
  return `«${persona}» resultó electo en ${historial.length} cargos entre ${historial[0].anio} y ${
    historial[historial.length - 1].anio
  }:\n${lineas.join("\n")}`;
}

export interface CandidatoPersonaTemplate {
  nombre_completo: string;
  cargos: Array<{ cargo: string; anios: number[] }>;
}

export function personaAmbiguaTemplate(
  consulta: string,
  candidatos: CandidatoPersonaTemplate[]
): string {
  if (candidatos.length === 0) {
    return `«${consulta}» coincide con varias personas en los registros. Reformulá indicando el nombre completo.`;
  }
  const lineas = candidatos.map((candidato) => {
    const detalles = candidato.cargos
      .map(({ cargo, anios }) => `${cargo.toLowerCase()} en ${anios.join(", ")}`)
      .join("; ");
    return `- ${candidato.nombre_completo} (${detalles})`;
  });
  return `«${consulta}» coincide con varias personas en los registros:\n${lineas.join(
    "\n"
  )}\n¿A cuál te referís? Podés reformular indicando el nombre completo.`;
}

export function participacionTemplate(datos: TemplateData): string {
  const { anio, participacionDatos } = datos;
  if (!participacionDatos || participacionDatos.padron === null) {
    return `No tengo el padrón de ${anio} para calcular la participación.`;
  }
  return `En ${anio} votó el ${formatPercentage(
    participacionDatos.porcentaje
  )} del padrón (${formatNumber(participacionDatos.votantes)} de ${formatNumber(
    participacionDatos.padron
  )} electores habilitados).`;
}

export function fueraDeAlcanceTemplate(motivo: MotivoRechazo): string {
  switch (motivo) {
    case "ambito_no_local":
      return "Esta plataforma solo publica resultados de elecciones municipales de Tandil. No tengo datos de otras localidades ni de cargos nacionales o provinciales.";
    case "paso":
      return "Esta plataforma solo publica resultados de elecciones generales. No tengo datos de las elecciones PASO.";
    case "cargo_no_local":
      return "Esta plataforma solo publica resultados de cargos municipales de Tandil: intendente, concejales y consejeros escolares.";
    case "comparacion_partido_entre_anios":
      return "No comparo el desempeño de una misma agrupación entre elecciones distintas; los resultados se responden una elección a la vez.";
    case "no_entendida":
      return "No entendí tu pregunta.";
  }
}

export function sinDatosTemplate(): string {
  return "No tengo datos para esa consulta: puede que en ese año no haya habido elección municipal en Tandil o que ese cargo no se haya elegido.";
}

export function noEntendidaTemplate(): string {
  return "No entendí tu pregunta. Reformulá indicando la elección (por ejemplo, el año) y qué querés saber.";
}

export function categoriaNoDisponibleTemplate(): string {
  return "Esta consulta todavía no está disponible.";
}

export function errorSistemaTemplate(): string {
  return "Ocurrió un error al procesar tu pregunta. Volvé a intentar en unos minutos.";
}

function templatePorCategoria(datos: TemplateData): string {
  switch (datos.categoria) {
    case "ganador_eleccion":
    case "ganador_intendencia":
      return ganadorTemplate(datos);
    case "diferencia_primero_segundo":
      return diferenciaTemplate(datos);
    case "ranking_top_n":
      return rankingTemplate(datos);
    case "totales_eleccion":
      return totalesTemplate(datos);
    case "bancas_por_partido":
      return bancasTemplate(datos);
    case "personas_electas_cargo":
      return electosTemplate(datos);
    case "serie_total_votos":
      return serieTemplate(datos);
    case "participacion":
      return participacionTemplate(datos);
    case "votos_agrupacion":
      return votosAgrupacionTemplate(datos);
    case "participacion_agrupacion":
      return participacionAgrupacionTemplate(datos);
    case "serie_agrupacion":
      return serieAgrupacionTemplate(datos);
    case "historial_persona":
      return historialPersonaTemplate(datos);
  }
}

export function armarRespuesta(
  tipo: "respuesta" | "fuera_de_alcance" | "sin_datos" | "no_entendida" | "categoria_no_disponible" | "error_sistema",
  datos: TemplateData | null,
  interp: Interpretacion | null
): Respuesta {
  let texto: string;
  let advertencia: string | null = null;

  switch (tipo) {
    case "respuesta":
      if (!datos) {
        throw new Error("armarRespuesta: el tipo 'respuesta' requiere datos.");
      }
      texto = templatePorCategoria(datos);
      advertencia = advertenciaTemplate(datos);
      break;
    case "fuera_de_alcance":
      texto =
        "Esta consulta está fuera del alcance de la plataforma, que solo publica resultados de elecciones municipales de Tandil.";
      break;
    case "sin_datos":
      texto = sinDatosTemplate();
      break;
    case "no_entendida":
      texto = noEntendidaTemplate();
      break;
    case "categoria_no_disponible":
      texto = categoriaNoDisponibleTemplate();
      break;
    case "error_sistema":
      texto = errorSistemaTemplate();
      break;
  }

  if (advertencia) {
    texto = `${texto}\n\nAdvertencia: ${advertencia}`;
  }
  if (tipo === "respuesta" && interp) {
    texto = `${texto}\n\n${lineaInterpretacion(interp)}`;
  }

  return {
    tipo,
    texto,
    advertencia,
    interpretacion: interp,
    desde_cache: false,
  };
}
