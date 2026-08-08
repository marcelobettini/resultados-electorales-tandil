import type { Metadata } from "next";
import { getEleccionesList } from "@/lib/queries/elections";
import { ElectionList } from "@/components/election-list";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Elecciones históricas",
  description:
    "Histórico de resultados oficiales de las elecciones generales de Tandil, desde 1963 hasta la actualidad.",
};

export default async function HomePage() {
  const elecciones = await getEleccionesList();

  return (
    <main id="main" className="page">
      <h1>Resultados electorales de Tandil</h1>
      <p className="page__intro">
        Consultá los resultados oficiales definitivos de las elecciones generales locales, desde
        1963 hasta la actualidad.
      </p>
      <ElectionList elecciones={elecciones} />
    </main>
  );
}
