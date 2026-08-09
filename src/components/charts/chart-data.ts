import type { AgrupacionResult } from "@/lib/types";

export interface ChartItem {
  nombre: string;
  votos: number;
  porcentaje: number | null;
  color: string;
}

export interface LegendItem {
  nombre: string;
  votos: number;
  color: string;
}

export interface DonutSegment {
  nombre: string;
  votos: number;
  color: string;
  isOtros: boolean;
}

export const PALETTE = [
  "#0B4EA2",
  "#B23B2E",
  "#5B2C86",
  "#1F7A6D",
  "#C79A2E",
  "#3A5A8C",
  "#8C2F4F",
  "#2E7D94",
  "#7A6A1F",
  "#54607A",
  "#8A6D3B",
  "#6E4E8E",
];

export const OTROS_COLOR = "#7B828C";

export function assignColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/** Construye los ítems para el gráfico de votos de la elección, con color por frente
 *  asignado por orden de votos (la lista más votada lleva el azul institucional).
 *  Excluye agrupaciones sin votos: no hay nada que graficar. El orden de salida
 *  preserva el de las agrupaciones originales. */
export function buildChartItems(agrupaciones: AgrupacionResult[]): ChartItem[] {
  const withVotes = agrupaciones.filter((a) => (a.votos ?? 0) > 0);
  const ranked = [...withVotes].sort((a, b) => (b.votos ?? 0) - (a.votos ?? 0));
  const colorById = new Map<number, string>();
  ranked.forEach((a, i) => colorById.set(a.id, assignColor(i)));
  return withVotes.map((a) => ({
    nombre: a.nombre,
    votos: a.votos ?? 0,
    porcentaje: a.porcentaje,
    color: colorById.get(a.id) ?? OTROS_COLOR,
  }));
}

/**
 * Colapsa los frentes menores en "Otros" dejando como máximo `max` segmentos
 * (regla FR-005: donut <= 6 segmentos). Ordena por votos desc.
 */
export function buildDonutSegments(items: ChartItem[], max = 6): DonutSegment[] {
  const sorted = [...items].sort((a, b) => b.votos - a.votos);
  if (sorted.length <= max) {
    return sorted.map((it) => ({
      nombre: it.nombre,
      votos: it.votos,
      color: it.color,
      isOtros: false,
    }));
  }
  const top = sorted.slice(0, max - 1);
  const otros = sorted.slice(max - 1);
  const votosOtros = otros.reduce((acc, it) => acc + it.votos, 0);
  return [
    ...top.map((it) => ({
      nombre: it.nombre,
      votos: it.votos,
      color: it.color,
      isOtros: false,
    })),
    { nombre: "Otros", votos: votosOtros, color: OTROS_COLOR, isOtros: true },
  ];
}

export function chartLegendItems(items: ChartItem[]): LegendItem[] {
  return items.map((it) => ({ nombre: it.nombre, votos: it.votos, color: it.color }));
}

export function segmentLegendItems(segments: DonutSegment[]): LegendItem[] {
  return segments.map((s) => ({ nombre: s.nombre, votos: s.votos, color: s.color }));
}
