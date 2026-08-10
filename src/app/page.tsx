import type { Metadata } from "next";
import { getEleccionesList } from "@/lib/queries/elections";
import { ElectionList } from "@/components/election-list";
import QuestionBox from "@/components/question-box";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Elecciones históricas",
  description:
    "Histórico de resultados oficiales de las elecciones generales de Tandil, desde 1963 hasta la actualidad.",
};

export default async function HomePage() {
  const elecciones = await getEleccionesList();
  const ultima = elecciones.length > 0 ? elecciones[elecciones.length - 1].anio : null;

  return (
    <main id="main" className="page page--home">
      <section className="hero" aria-labelledby="hero-heading">
        <p className="hero__eyebrow">Archivo oficial · 1963{ultima ? ` — ${ultima}` : ""}</p>
        <h1 id="hero-heading">Resultados electorales de Tandil</h1>
        <p className="hero__intro">
          El escrutinio definitivo de las elecciones de la ciudad, desde 1963 hasta hoy. Elección
          por elección: votos, porcentajes, bancas y personas electas.
        </p>
        <QuestionBox />
      </section>
      <ElectionList elecciones={elecciones} />
    </main>
  );
}
