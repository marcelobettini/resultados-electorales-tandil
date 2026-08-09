import type { AgrupacionResult, Office } from "@/lib/types";
import { displayValue, formatNumber, formatPercentage } from "@/lib/format";

interface Props {
  agrupaciones: AgrupacionResult[];
  offices: Office[];
}

function seatCell(agrupacion: AgrupacionResult, office: Office): string {
  switch (office.code) {
    case "intendente":
      return agrupacion.obtuvo_intendencia ? "Sí" : "—";
    case "concejales":
      return agrupacion.concejales_obtenidos > 0 ? String(agrupacion.concejales_obtenidos) : "—";
    case "consejeros_escolares":
      return agrupacion.consejeros_obtenidos > 0 ? String(agrupacion.consejeros_obtenidos) : "—";
  }
}

export function ResultsTable({ agrupaciones, offices }: Props) {
  if (agrupaciones.length === 0) {
    return <p>Sin datos de partidos para esta elección.</p>;
  }

  const eligeIntendente = offices.some((o) => o.code === "intendente");
  const ganadoraId = eligeIntendente
    ? (agrupaciones.find((a) => a.obtuvo_intendencia)?.id ?? null)
    : null;

  return (
    <div
      className="results-table-scroll"
      role="region"
      aria-label="Resultados por partido"
      tabIndex={0}
    >
      <table className="results-table">
        <caption>Resultados por partido</caption>
        <thead>
          <tr>
            <th rowSpan={2} scope="col">
              Lista
            </th>
            <th rowSpan={2} scope="col">
              Partido / Frente
            </th>
            <th rowSpan={2} scope="col" className="num">
              Votos
            </th>
            <th rowSpan={2} scope="col" className="num results-table__pct">
              Porcentaje
            </th>
            <th colSpan={offices.length} scope="colgroup">
              Bancas
            </th>
          </tr>
          <tr>
            {offices.map((office) => (
              <th key={office.code} scope="col" className="num">
                {office.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agrupaciones.map((agrupacion) => {
            const esGanadora = agrupacion.id === ganadoraId;
            return (
              <tr key={agrupacion.id} className={esGanadora ? "results-table__winner" : undefined}>
                <td>{displayValue(agrupacion.numero_lista)}</td>
                <th scope="row">{agrupacion.nombre}</th>
                <td className="num">{formatNumber(agrupacion.votos)}</td>
                <td className="num results-table__pct">
                  {formatPercentage(agrupacion.porcentaje)}
                </td>
                {offices.map((office) => (
                  <td key={office.code} className="num">
                    {seatCell(agrupacion, office)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
