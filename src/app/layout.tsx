import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "@/styles/globals.css";
import { RegisterSW } from "@/components/register-sw";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plexmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Resultados Electorales de Tandil",
    template: "%s · Resultados Electorales de Tandil",
  },
  description:
    "Consulta pública de los resultados oficiales de las elecciones locales de Tandil (Provincia de Buenos Aires, Argentina). Histórico desde 1963.",
};

export const viewport: Viewport = {
  themeColor: "#0B4EA2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Saltar al contenido principal
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <RegisterSW />
      </body>
    </html>
  );
}
