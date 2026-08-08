import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEleccionByYear } from "@/lib/queries/elections";
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

  return (
    <main id="main" className="page">
      <p className="page__back">
        <Link href="/">← Volver al histórico</Link>
      </p>
      <h1>Elecciones {eleccion.anio}</h1>
      <ElectionHeader eleccion={eleccion} />
      <ElectionResults eleccion={eleccion} />
    </main>
  );
}
