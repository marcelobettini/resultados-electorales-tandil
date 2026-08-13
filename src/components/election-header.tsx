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
    <section className="datos" aria-labelledby="datos-generales-heading">
      <h2 id="datos-generales-heading" className="section-title">
        Datos generales
      </h2>
      <dl className="datos__grid">
        {GENERALES.map(([label, format]) => (
          <div key={label} className="datos__cell">
            <dt>{label}</dt>
            <dd>{format(eleccion)}</dd>
          </div>
        ))}
      </dl>
      {eleccion.notas && (
        <aside className="datos__nota">
          <h3 className="datos__nota-title">Contexto histórico</h3>
          <p className="datos__nota-text">{eleccion.notas}</p>
        </aside>
      )}
      <PdfDownload urlPdf={eleccion.url_pdf} />
    </section>
  );
}
