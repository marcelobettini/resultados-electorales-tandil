import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PdfDownload } from "@/components/pdf-download";

describe("PdfDownload", () => {
  it("renderiza un enlace externo accesible cuando hay url_pdf", () => {
    render(<PdfDownload urlPdf="https://example.com/acta.pdf" />);

    const link = screen.getByRole("link", { name: /Descargar acta oficial \(PDF\)/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(link).toHaveAttribute("href", "https://example.com/acta.pdf");
  });

  it("muestra el estado 'PDF no disponible' cuando url_pdf es null, sin enlace roto", () => {
    render(<PdfDownload urlPdf={null} />);

    expect(screen.getByText(/PDF no disponible/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
