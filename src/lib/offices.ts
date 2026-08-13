import type { AgrupacionResult, Eleccion, Office } from "@/lib/types";

/**
 * Deriva los cargos que se eligieron en una eleccion a partir de los flags
 * de la tabla `elecciones` (FR-007: solo se muestran los cargos elegidos).
 * No es un calculo aritmetico: interpreta columnas booleanas/opcionales.
 */
export function deriveOffices(
  eleccion: Pick<Eleccion, "elige_intendente" | "cantidad_concejales" | "cantidad_consejeros">
): Office[] {
  const offices: Office[] = [];
  if (eleccion.elige_intendente) {
    offices.push({ code: "intendente", name: "Intendente", order: 1 });
  }
  if (eleccion.cantidad_concejales !== null && eleccion.cantidad_concejales !== undefined) {
    offices.push({ code: "concejales", name: "Concejales", order: 2 });
  }
  if (eleccion.cantidad_consejeros !== null && eleccion.cantidad_consejeros !== undefined) {
    offices.push({ code: "consejeros_escolares", name: "Consejeros Escolares", order: 3 });
  }
  return offices;
}

/** Devuelve las bancas precalculadas de una agrupacion para un cargo. */
export function seatsFor(frente: AgrupacionResult, code: Office["code"]): number | null {
  switch (code) {
    case "intendente":
      return frente.obtuvo_intendencia ? 1 : 0;
    case "concejales":
      return frente.concejales_obtenidos;
    case "consejeros_escolares":
      return frente.consejeros_obtenidos;
  }
}
