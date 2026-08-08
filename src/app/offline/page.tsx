import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sin conexión",
};

export default function OfflinePage() {
  return (
    <main className="page">
      <h1>Sin conexión</h1>
      <p>
        No hay conexión a internet en este momento. Revisá tu red y volvé a intentarlo; las
        elecciones que ya visitaste siguen disponibles sin conexión.
      </p>
      <p className="page__back">
        <Link href="/">Volver al inicio</Link>
      </p>
    </main>
  );
}
