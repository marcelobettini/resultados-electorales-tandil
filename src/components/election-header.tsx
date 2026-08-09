import type { Eleccion } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/format";
import { PdfDownload } from "@/components/pdf-download";

interface Props {
  eleccion: Eleccion;
}

const GENERALES: Array<[string, (e: Eleccion) => string]> = [
  ["Fecha", (e) => formatDate(e.fecha)],
  ["Electores habilitados", (e) => formatNumber(e.electores_habilitados)],
  ["Total de mesas", (e) => formatNumber(e.total_mesas)],
  ["Votos positivos", (e) => formatNumber(e.votos_positivos)],
  ["Votos en blanco", (e) => formatNumber(e.votos_blanco)],
  ["Votos nulos", (e) => formatNumber(e.votos_nulos)],
];

export function ElectionHeader({ eleccion }: Props) {
  return (
    <section aria-labelledby="datos-generales-heading">
      <h2 id="datos-generales-heading">Datos generales</h2>
      <dl className="election-header">
        {GENERALES.map(([label, format]) => (
          <div key={label} className="election-header__item">
            <dt>{label}</dt>
            <dd>{format(eleccion)}</dd>
          </div>
        ))}
      </dl>
      {eleccion.notas && <p className="election-header__nota">{eleccion.notas}</p>}
      <PdfDownload urlPdf={eleccion.url_pdf} />
    </section>
  );
}
