import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sin conexión",
};

export default function OfflinePage() {
  return (
    <main id="main" className="page">
      <section className="hero">
        <p className="hero__eyebrow">Sin conexión</p>
        <h1>Sin conexión</h1>
        <p className="hero__intro">
          No hay conexión a internet en este momento. Revisá tu red y volvé a intentarlo; las
          elecciones que ya visitaste siguen disponibles sin conexión.
        </p>
      </section>
      <p className="page__back">
        <Link href="/">← Volver al inicio</Link>
      </p>
    </main>
  );
}
