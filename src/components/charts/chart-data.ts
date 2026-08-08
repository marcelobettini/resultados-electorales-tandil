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
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#59A14F",
  "#EDC948",
  "#B07AA1",
  "#FF9DA7",
  "#9C755F",
  "#BAB0AC",
  "#86BCB6",
  "#D37295",
];

export const OTROS_COLOR = "#6B7280";

export function assignColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/** Construye los ítems para el gráfico de votos de la elección, con color por frente.
 *  Excluye agrupaciones sin votos: no hay nada que graficar. */
export function buildChartItems(agrupaciones: AgrupacionResult[]): ChartItem[] {
  return agrupaciones
    .filter((a) => (a.votos ?? 0) > 0)
    .map((a, i) => ({
      nombre: a.nombre,
      votos: a.votos ?? 0,
      porcentaje: a.porcentaje,
      color: assignColor(i),
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
