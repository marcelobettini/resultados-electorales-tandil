import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { buildDonutSegments, buildChartItems } from "@/components/charts/chart-data";
import type { AgrupacionResult } from "@/lib/types";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  const MockResponsiveContainer = ({
    children,
    width,
    height,
  }: {
    children: React.ReactNode;
    width: number | string;
    height: number | string;
  }) => <div style={{ width, height }}>{children}</div>;
  return { ...actual, ResponsiveContainer: MockResponsiveContainer };
});

function makeAgrupaciones(count: number): AgrupacionResult[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    numero_lista: String(i + 1),
    nombre: `Frente ${i + 1}`,
    votos: (count - i) * 100,
    porcentaje: null,
    concejales_obtenidos: 0,
    consejeros_obtenidos: 0,
    obtuvo_intendencia: i === 0,
    orden_visualizacion: i + 1,
  }));
}

describe("buildDonutSegments (colapso a max 6 segmentos)", () => {
  it("no colapsa cuando hay 6 o menos frentes", () => {
    const items = buildChartItems(makeAgrupaciones(5));
    const segments = buildDonutSegments(items, 6);
    expect(segments).toHaveLength(5);
    expect(segments.some((s) => s.isOtros)).toBe(false);
  });

  it("colapsa los menores en 'Otros' dejando maximo 6 segmentos", () => {
    const items = buildChartItems(makeAgrupaciones(8));
    const segments = buildDonutSegments(items, 6);
    expect(segments).toHaveLength(6);
    const otros = segments[segments.length - 1];
    expect(otros.nombre).toBe("Otros");
    expect(otros.isOtros).toBe(true);
    const votosTop5 = items
      .sort((a, b) => b.votos - a.votos)
      .slice(0, 5)
      .reduce((acc, it) => acc + it.votos, 0);
    const votosOtros = items.reduce((acc, it) => acc + it.votos, 0) - votosTop5;
    expect(otros.votos).toBe(votosOtros);
  });

  it("suma exacta: la suma de los segmentos equivale al total de votos", () => {
    const items = buildChartItems(makeAgrupaciones(9));
    const segments = buildDonutSegments(items, 6);
    const total = items.reduce((acc, it) => acc + it.votos, 0);
    const sumaSegmentos = segments.reduce((acc, s) => acc + s.votos, 0);
    expect(sumaSegmentos).toBe(total);
  });
});

describe("buildChartItems (filtrado)", () => {
  it("excluye agrupaciones con 0 votos (no hay nada que graficar)", () => {
    const base = makeAgrupaciones(3);
    const conVacio = [
      ...base,
      { ...base[0], id: 99, nombre: "Vacio", votos: 0 },
      { ...base[0], id: 98, nombre: "Sin datos", votos: null },
    ];
    const items = buildChartItems(conVacio);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.votos > 0)).toBe(true);
  });

  it("mantiene el orden de las agrupaciones con votos", () => {
    const conVacio = [
      { ...makeAgrupaciones(1)[0], id: 1, nombre: "A", votos: 100 },
      { ...makeAgrupaciones(1)[0], id: 2, nombre: "B", votos: 0 },
      { ...makeAgrupaciones(1)[0], id: 3, nombre: "C", votos: 50 },
    ];
    const items = buildChartItems(conVacio);
    expect(items.map((i) => i.nombre)).toEqual(["A", "C"]);
  });
});

describe("VotesDonut (smoke)", () => {
  it("renderiza un sector por segmento (incluido 'Otros')", async () => {
    const { VotesDonut } = await import("@/components/charts/votes-donut");
    const items = buildChartItems(makeAgrupaciones(8));
    const { container } = render(<VotesDonut items={items} />);
    expect(container.querySelectorAll(".recharts-sector")).toHaveLength(6);
  });
});
