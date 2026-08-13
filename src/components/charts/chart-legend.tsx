import { formatNumber } from "@/lib/format";
import type { LegendItem } from "./chart-data";

interface Props {
  items: LegendItem[];
}

/** Leyenda como lista HTML real con nombre, valor y muestra de color (1.4.1). */
export function ChartLegend({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <ul className="chart-legend">
      {items.map((it) => (
        <li key={it.nombre} className="chart-legend__item">
          <span
            className="chart-legend__swatch"
            style={{ backgroundColor: it.color }}
            aria-hidden="true"
          />
          <span className="chart-legend__name">{it.nombre}</span>
          <span className="chart-legend__value">{formatNumber(it.votos)}</span>
        </li>
      ))}
    </ul>
  );
}
