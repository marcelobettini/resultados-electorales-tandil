import type { TemplateData } from "./templates";

export function advertenciaEmpate(): string {
  return "se registró un empate en el primer puesto; no hay una agrupación ganadora única.";
}

export function advertenciaDatosFaltantes(): string {
  return "algunos datos de esta consulta no están registrados en la base.";
}

export function advertenciaSerieAgrupacion(): string {
  return "las agrupaciones cambian de nombre y composición entre elecciones; los registros se agruparon por coincidencia de nombre.";
}

export function advertenciaTemplate(datos: TemplateData): string | null {
  if (datos.empate) {
    return advertenciaEmpate();
  }
  if (datos.ganador?.votos === null) {
    return advertenciaDatosFaltantes();
  }
  if (datos.serie.some((anio) => anio.votos === null)) {
    return advertenciaDatosFaltantes();
  }
  if (datos.votosAgrupacion?.votos === null) {
    return advertenciaDatosFaltantes();
  }
  if (datos.serieAgrupacion?.some((registro) => registro.votos === null)) {
    return advertenciaDatosFaltantes();
  }
  if (
    datos.categoria === "serie_agrupacion" &&
    new Set((datos.serieAgrupacion ?? []).map((registro) => registro.nombre)).size > 1
  ) {
    return advertenciaSerieAgrupacion();
  }
  return null;
}
