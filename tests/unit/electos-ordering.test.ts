import { describe, expect, it } from "vitest";
import { sortElectosByFrenteVotos } from "@/lib/electos";
import type { AgrupacionResult, Electo } from "@/lib/types";

function makeAgrupacion(nombre: string, votos: number): AgrupacionResult {
  return {
    id: Math.random(),
    numero_lista: "1",
    nombre,
    votos,
    porcentaje: null,
    concejales_obtenidos: 0,
    consejeros_obtenidos: 0,
    obtuvo_intendencia: false,
    orden_visualizacion: null,
  };
}

function makeElecto(frente: string | null, orden: number): Electo {
  return {
    nombre_completo: `Persona ${orden}`,
    condicion: "TITULAR",
    orden,
    agrupacion_nombre: frente,
  };
}

describe("sortElectosByFrenteVotos", () => {
  it("ordena los frentes por votos descendente (partido con más votos primero)", () => {
    const agrupaciones = [
      makeAgrupacion("Partido A", 5000),
      makeAgrupacion("Partido B", 9000),
      makeAgrupacion("Partido C", 1000),
    ];
    const electos = [
      makeElecto("Partido A", 1),
      makeElecto("Partido C", 1),
      makeElecto("Partido B", 1),
    ];

    const ordenado = sortElectosByFrenteVotos(electos, agrupaciones);
    expect(ordenado.map((e) => e.agrupacion_nombre)).toEqual([
      "Partido B",
      "Partido A",
      "Partido C",
    ]);
  });

  it("conserva el orden interno de cada frente (titulares/suplentes por lista)", () => {
    const agrupaciones = [makeAgrupacion("Partido A", 5000)];
    const electos = [
      makeElecto("Partido A", 1),
      makeElecto("Partido A", 2),
      makeElecto("Partido A", 3),
    ];

    const ordenado = sortElectosByFrenteVotos(electos, agrupaciones);
    expect(ordenado.map((e) => e.orden)).toEqual([1, 2, 3]);
  });

  it("manda los electos sin agrupación al final", () => {
    const agrupaciones = [makeAgrupacion("Partido A", 5000)];
    const electos = [makeElecto("Partido A", 1), makeElecto(null, 1)];

    const ordenado = sortElectosByFrenteVotos(electos, agrupaciones);
    expect(ordenado.map((e) => e.agrupacion_nombre)).toEqual(["Partido A", null]);
  });
});
