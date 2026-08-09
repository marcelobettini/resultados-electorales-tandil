interface Props {
  urlPdf: string | null;
}

/** Enlace de descarga del acta oficial. Si no hay URL externa, estado claro de no disponibilidad. */
export function PdfDownload({ urlPdf }: Props) {
  if (urlPdf === null) {
    return <p className="acta acta--na">Acta oficial: PDF no disponible.</p>;
  }

  return (
    <p className="acta">
      <a
        href={urlPdf}
        target="_blank"
        rel="noreferrer"
        className="acta__link"
        aria-label="Descargar acta oficial (PDF)"
      >
        <span className="acta__doc" aria-hidden="true" />
        <span className="acta__text">
          <span className="acta__title">Acta oficial</span>
          <span className="acta__sub">Descargar PDF</span>
        </span>
        <span className="acta__arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </p>
  );
}
