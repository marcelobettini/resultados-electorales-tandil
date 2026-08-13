import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEleccionByYear } from "@/lib/queries/elections";
import { formatDate } from "@/lib/format";
import { ElectionHeader } from "@/components/election-header";
import { ElectionResults } from "@/components/election-results";

export const revalidate = 3600;

interface Props {
  params: Promise<{ year: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const anio = Number(year);
  return {
    title: Number.isInteger(anio) ? `Elecciones ${anio}` : "Elección",
  };
}

export default async function ElectionPage({ params }: Props) {
  const { year } = await params;
  const anio = Number(year);
  if (!Number.isInteger(anio)) notFound();

  const eleccion = await getEleccionByYear(anio);
  if (!eleccion) notFound();

  const fecha = eleccion.fecha ? formatDate(eleccion.fecha) : null;

  return (
    <main id="main" className="page page--election">
      <p className="page__back">
        <Link href="/">← Histórico</Link>
      </p>
      <header className="detail-head">
        <p className="detail-head__eyebrow">
          <span className="sello sello--ballot sello--check" aria-hidden="true" />
          Escrutinio definitivo
        </p>
        <h1 className="detail-head__year">
          <span className="sr-only">Elecciones </span>
          {eleccion.anio}
        </h1>
        {fecha && <p className="detail-head__meta">Elecciones municipales · {fecha}</p>}
      </header>
      <ElectionHeader eleccion={eleccion} />
      <ElectionResults eleccion={eleccion} />
    </main>
  );
}
