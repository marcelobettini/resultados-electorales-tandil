import type { TemplateData } from "./templates";

export function advertenciaEmpate(): string {
  return "se registró un empate en el primer puesto; no hay una agrupación ganadora única.";
}

export function advertenciaDatosFaltantes(): string {
  return "algunos datos de esta consulta no están registrados en la base.";
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
  return null;
}
