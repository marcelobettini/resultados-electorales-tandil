import type { CategoriaId } from "../types";

export interface CategoriaTaxonomia {
  id: CategoriaId;
  nombreLegible: string;
  implemented: boolean;
  descripcion: string;
}

export const TAXONOMY: CategoriaTaxonomia[] = [
  {
    id: "ganador_eleccion",
    nombreLegible: "ganador de la elección",
    implemented: true,
    descripcion: "Agrupación ganadora de una elección (top por votos del año).",
  },
  {
    id: "ganador_intendencia",
    nombreLegible: "ganador de la intendencia",
    implemented: true,
    descripcion: "Agrupación que obtuvo la intendencia en el año (obtuvo_intendencia = 1).",
  },
  {
    id: "diferencia_primero_segundo",
    nombreLegible: "diferencia entre el primero y el segundo",
    implemented: true,
    descripcion: "Diferencia de votos entre la primera y la segunda agrupación del año.",
  },
  {
    id: "ranking_top_n",
    nombreLegible: "ranking de los primeros N",
    implemented: true,
    descripcion: "Ranking de las primeras N agrupaciones por votos del año (límite por defecto 3).",
  },
  {
    id: "totales_eleccion",
    nombreLegible: "totales de la elección",
    implemented: true,
    descripcion: "Totales de la elección: votantes, padrón, votos válidos, blancos, nulos y mesas.",
  },
  {
    id: "bancas_por_partido",
    nombreLegible: "bancas por partido",
    implemented: true,
    descripcion: "Bancas obtenidas por cada agrupación según el cargo (concejales, consejeros o intendencia).",
  },
  {
    id: "personas_electas_cargo",
    nombreLegible: "personas electas por cargo",
    implemented: true,
    descripcion: "Nómina de personas electas en un cargo (con titulares y suplentes) del año.",
  },
  {
    id: "serie_total_votos",
    nombreLegible: "serie del total de votos por año",
    implemented: true,
    descripcion: "Evolución del total de votos emitidos a lo largo de los años; no compara agrupaciones entre años.",
  },
  {
    id: "participacion",
    nombreLegible: "porcentaje de participación",
    implemented: false,
    descripcion: "Reconocida pero no implementada: exigiría calcular el cociente votos/padrón (no se calcula nada).",
  },
];

export const CATEGORIAS_IMPLEMENTADAS: CategoriaId[] = TAXONOMY.filter(
  (categoria) => categoria.implemented
).map((categoria) => categoria.id);

const IDS_VALIDOS = new Set<CategoriaId>(TAXONOMY.map((categoria) => categoria.id));

export function esCategoria(id: string): id is CategoriaId {
  return (IDS_VALIDOS as Set<string>).has(id);
}

export function getCategoria(id: CategoriaId): CategoriaTaxonomia {
  const categoria = TAXONOMY.find((categoria) => categoria.id === id);
  if (!categoria) {
    throw new Error(`Categoría desconocida: ${id}`);
  }
  return categoria;
}

export function nombreLegible(id: CategoriaId): string {
  return getCategoria(id).nombreLegible;
}
