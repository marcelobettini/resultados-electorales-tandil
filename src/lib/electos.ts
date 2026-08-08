import type { AgrupacionResult, Electo } from "@/lib/types";

/** Ordena los electos agrupando los frentes según los votos de la elección (mayor → menor).
 *  Sort estable: conserva el orden interno por condición/lista de cada frente. */
export function sortElectosByFrenteVotos(
  electos: Electo[],
  agrupaciones: AgrupacionResult[]
): Electo[] {
  const votosPorFrente = new Map(agrupaciones.map((a) => [a.nombre, a.votos ?? 0]));
  const votosDe = (e: Electo) => votosPorFrente.get(e.agrupacion_nombre ?? "Sin agrupación") ?? 0;
  return [...electos].sort((a, b) => votosDe(b) - votosDe(a));
}
