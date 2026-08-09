import type { AgrupacionResult, Eleccion, Office } from "@/lib/types";
import { getAgrupaciones, getElectos } from "@/lib/queries/results";
import { deriveOffices } from "@/lib/offices";
import { sortElectosByFrenteVotos } from "@/lib/electos";
import { formatNumber, formatPercentage } from "@/lib/format";
import { ResultsTable } from "@/components/results-table";
import { ElectedList } from "@/components/elected-list";
import { VotesDonut } from "@/components/charts/votes-donut";
import { VotesBarChart } from "@/components/charts/votes-bar-chart";
import { ChartLegend } from "@/components/charts/chart-legend";
import {
  buildChartItems,
  buildDonutSegments,
  chartLegendItems,
  segmentLegendItems,
} from "@/components/charts/chart-data";

interface Props {
  eleccion: Eleccion;
}

function buildResumen(anio: number, agrupaciones: AgrupacionResult[], offices: Office[]): string {
  const tieneIntendente = offices.some((o) => o.code === "intendente");
  const top = [...agrupaciones].sort((a, b) => (b.votos ?? 0) - (a.votos ?? 0)).slice(0, 3);
  const frases = top.map((a) => {
    let s = `${a.nombre}: ${formatNumber(a.votos)} votos`;
    if (a.porcentaje !== null) {
      s += ` (${formatPercentage(a.porcentaje)})`;
    }
    const partes: string[] = [];
    if (tieneIntendente && a.obtuvo_intendencia) {
      partes.push("ganó la intendencia");
    }
    if ((a.concejales_obtenidos ?? 0) > 0) {
      partes.push(
        `${a.concejales_obtenidos} ${a.concejales_obtenidos === 1 ? "concejal" : "concejales"}`
      );
    }
    if ((a.consejeros_obtenidos ?? 0) > 0) {
      partes.push(
        `${a.consejeros_obtenidos} ${a.consejeros_obtenidos === 1 ? "consejero escolar" : "consejeros escolares"}`
      );
    }
    if (partes.length > 0) {
      s += `, ${partes.join(", ")}`;
    }
    return s;
  });
  return `${anio}: ${frases.join(". ")}.`;
}

export async function ElectionResults({ eleccion }: Props) {
  const offices = deriveOffices(eleccion);
  const agrupaciones = await getAgrupaciones(eleccion.id, eleccion.anio);

  const items = buildChartItems(agrupaciones);
  const useBars = items.length >= 10;
  const donutSegments = useBars ? [] : buildDonutSegments(items, 6);
  const legendItems = useBars ? chartLegendItems(items) : segmentLegendItems(donutSegments);
  const resumen = buildResumen(eleccion.anio, agrupaciones, offices);

  const electosPorCargo = await Promise.all(
    offices.map(async (office) => {
      const electos = await getElectos(eleccion.id, office.code, eleccion.anio);
      return { office, electos: sortElectosByFrenteVotos(electos, agrupaciones) };
    })
  );

  return (
    <section className="election-results" aria-labelledby="resultados-heading">
      <h2 id="resultados-heading" className="section-title">
        Resultados
      </h2>
      <ResultsTable agrupaciones={agrupaciones} offices={offices} />

      {items.length > 0 && (
        <figure className="election-charts">
          <figcaption className="election-charts__title">Comparación de votos</figcaption>
          <div className="election-charts__body">
            <div aria-hidden="true" className="election-charts__viz">
              {useBars ? <VotesBarChart items={items} /> : <VotesDonut items={items} />}
            </div>
            <ChartLegend items={legendItems} />
          </div>
          <p className="election-charts__summary">{resumen}</p>
        </figure>
      )}

      <section className="elected-section" aria-labelledby="electos-heading">
        <h3 id="electos-heading" className="section-title">
          Personas electas
        </h3>
        {electosPorCargo.map(({ office, electos }) => (
          <div key={office.code} className="elected-cargo">
            <h4>{office.name}</h4>
            <ElectedList electos={electos} />
          </div>
        ))}
      </section>
    </section>
  );
}
