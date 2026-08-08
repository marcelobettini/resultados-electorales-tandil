import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { RegisterSW } from "@/components/register-sw";

export const metadata: Metadata = {
  title: {
    default: "Resultados Electorales de Tandil",
    template: "%s · Resultados Electorales de Tandil",
  },
  description:
    "Consulta pública de los resultados oficiales de las elecciones locales de Tandil (Provincia de Buenos Aires, Argentina). Histórico desde 1963.",
};

export const viewport: Viewport = {
  themeColor: "#14532d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main">
          Saltar al contenido principal
        </a>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
