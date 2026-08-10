import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as axeNs from "axe-core";
import QuestionBox from "@/components/question-box";
import type { Respuesta } from "@/lib/types";

// axe-core ships CommonJS (`export = axe`), so under Vite's CJS interop the
// namespace object only carries `default`. Resolve the real axe instance and
// type it through the namespace's own types.
type AxeInstance = typeof axeNs;
const axe: AxeInstance =
  (axeNs as unknown as { default: AxeInstance }).default ?? axeNs;

// WCAG 2.1 + 2.2 A/AA rules only, matching FR-014 (WCAG 2.2 AA). Color contrast
// cannot be evaluated in jsdom (no CSS layout engine): axe reports it as
// `incomplete`, never as a `violation`, so asserting on `violations` is enough.
const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

async function expectAxeClean(): Promise<void> {
  const results = await axe.run(document.body, {
    runOnly: { type: "tag", values: WCAG_TAGS },
  });
  const ids = results.violations.map((v) => v.id);
  expect(
    results.violations,
    `violaciones axe: ${ids.join(", ") || "ninguna"}`,
  ).toEqual([]);
}

function okResponse(respuesta: Respuesta): Response {
  return new Response(JSON.stringify({ ok: true, respuesta }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const RESPUESTA_OK: Respuesta = {
  tipo: "respuesta",
  texto: "El primer puesto fue «Agrupación A» con 21.000 votos.",
  interpretacion: {
    anio: 2001,
    categoria: "diferencia_primero_segundo",
    cargo: "intendente",
  },
  advertencia: null,
  desde_cache: false,
};

const PLACEHOLDER = "Hacé una pregunta sobre los resultados electorales…";

describe("QuestionBox accesibilidad (axe + WCAG 2.2 AA)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.documentElement.setAttribute("lang", "es");
    document.title = "Cuadro de preguntas sobre los resultados electorales";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("1. estado idle (render inicial)", () => {
    it("asocia el label al campo (htmlFor/id) y expone el botón de envío; pasa axe", async () => {
      render(<QuestionBox />);

      const input = screen.getByLabelText(
        /Hacé una pregunta sobre los resultados electorales/i,
      );
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("id", "pregunta");
      expect(input).toHaveAttribute("placeholder", PLACEHOLDER);

      const label = screen.getByText(
        /Hacé una pregunta sobre los resultados electorales/i,
      );
      expect(label.tagName).toBe("LABEL");
      expect(label).toHaveAttribute("for", "pregunta");

      expect(
        screen.getByRole("button", { name: /preguntar/i }),
      ).toBeInTheDocument();

      await expectAxeClean();
    });
  });

  describe("2. estado cargando", () => {
    it("marca aria-busy, deshabilita controles y anuncia 'Procesando…' en role=status; pasa axe", async () => {
      const never = new Promise<Response>(() => {});
      fetchMock.mockReturnValue(never);

      const user = userEvent.setup();
      render(<QuestionBox />);

      const input = screen.getByLabelText(
        /Hacé una pregunta sobre los resultados electorales/i,
      );
      await user.type(input, "¿Qué diferencia de votos hubo en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));

      const status = await screen.findByRole("status");
      expect(status).toHaveAttribute("aria-busy", "true");
      expect(within(status).getByText(/Procesando tu pregunta…/i)).toBeInTheDocument();

      const form = status.closest("form");
      expect(form).not.toBeNull();
      expect(form).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("button", { name: /preguntar/i })).toBeDisabled();
      expect(input).toBeDisabled();

      await expectAxeClean();
    });
  });

  describe("3. estado respuesta", () => {
    it("anuncia el texto de la respuesta dentro de role=status; pasa axe", async () => {
      fetchMock.mockResolvedValue(okResponse(RESPUESTA_OK));

      const user = userEvent.setup();
      render(<QuestionBox />);

      await user.type(
        screen.getByLabelText(/Hacé una pregunta sobre los resultados electorales/i),
        "¿Qué diferencia de votos hubo en 2001?",
      );
      await user.click(screen.getByRole("button", { name: /preguntar/i }));

      await screen.findByText(/Agrupación A/);
      const status = screen.getByRole("status");
      expect(within(status).getByText(/El primer puesto fue «Agrupación A»/)).toBeInTheDocument();
      expect(within(status).getByText(/Interpreté:/)).toBeInTheDocument();

      await expectAxeClean();
    });
  });

  describe("4. estado error", () => {
    it("anuncia el error en role=alert y deja el campo utilizable; pasa axe", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));

      const user = userEvent.setup();
      render(<QuestionBox />);

      const input = screen.getByLabelText(
        /Hacé una pregunta sobre los resultados electorales/i,
      );
      await user.type(input, "¿Quién ganó en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Ocurrió un error al procesar/i);
      expect(input).toBeEnabled();
      expect(
        screen.getByRole("button", { name: /preguntar/i }),
      ).toBeEnabled();

      await expectAxeClean();
    });

    it("mantiene la región de estado (role=status) presente para el próximo intento", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));

      const user = userEvent.setup();
      render(<QuestionBox />);

      await user.type(
        screen.getByLabelText(/Hacé una pregunta sobre los resultados electorales/i),
        "¿Quién ganó en 2001?",
      );
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      await screen.findByRole("alert");

      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
    });
  });

  describe("5. estados de rechazo (fuera_de_alcance / categoria_no_disponible)", () => {
    it.each(["fuera_de_alcance", "categoria_no_disponible"] as const)(
      "muestra el texto del tipo %s dentro de role=status; pasa axe",
      async (tipo) => {
        const respuesta: Respuesta = {
          tipo,
          texto: "Esta consulta no se puede responder con los datos disponibles.",
          interpretacion: null,
          advertencia: null,
          desde_cache: false,
        };
        fetchMock.mockResolvedValue(okResponse(respuesta));

        const user = userEvent.setup();
        render(<QuestionBox />);

        await user.type(
          screen.getByLabelText(/Hacé una pregunta sobre los resultados electorales/i),
          "¿Quién ganó la gobernación en 2001?",
        );
        await user.click(screen.getByRole("button", { name: /preguntar/i }));

        await screen.findByText(/no se puede responder/i);
        const status = screen.getByRole("status");
        expect(
          within(status).getByText(
            "Esta consulta no se puede responder con los datos disponibles.",
          ),
        ).toBeInTheDocument();

        await expectAxeClean();
      },
    );
  });

  describe("teclado (navegación y envío)", () => {
    it("el campo y el botón son alcanzables con Tab", async () => {
      const user = userEvent.setup();
      render(<QuestionBox />);

      await user.tab();
      expect(
        screen.getByLabelText(/Hacé una pregunta sobre los resultados electorales/i),
      ).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /preguntar/i })).toHaveFocus();
    });

    it("Enter en el campo envía la pregunta", async () => {
      fetchMock.mockResolvedValue(okResponse(RESPUESTA_OK));

      const user = userEvent.setup();
      render(<QuestionBox />);

      await user.type(
        screen.getByLabelText(/Hacé una pregunta sobre los resultados electorales/i),
        "¿Qué diferencia de votos hubo en 2001?{Enter}",
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/preguntar",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ pregunta: "¿Qué diferencia de votos hubo en 2001?" }),
        }),
      );

      await screen.findByText(/Agrupación A/);
      const status = screen.getByRole("status");
      expect(within(status).getByText(/El primer puesto fue «Agrupación A»/)).toBeInTheDocument();
    });
  });
});
