interface Props {
  urlPdf: string | null;
}

/** Enlace de descarga del acta oficial. Si no hay URL externa, estado claro de no disponibilidad. */
export function PdfDownload({ urlPdf }: Props) {
  if (urlPdf === null) {
    return <p className="election-header__pdf">PDF no disponible.</p>;
  }

  return (
    <p className="election-header__pdf">
      <a href={urlPdf} target="_blank" rel="noreferrer">
        Descargar acta oficial (PDF)
      </a>
    </p>
  );
}
