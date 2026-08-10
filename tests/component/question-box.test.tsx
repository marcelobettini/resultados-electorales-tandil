import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionBox from "@/components/question-box";

const PLACEHOLDER = "Hacé una pregunta sobre los resultados electorales…";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function okResponse(respuesta: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, respuesta }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function serverErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        tipo: "error_sistema",
        mensaje: "Ocurrió un error al procesar tu pregunta. Volvé a intentar en unos minutos.",
      },
    }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

const RESPUESTA_DIFERENCIA = {
  tipo: "respuesta",
  texto: "El primer puesto fue «Agrupación A» con 21.000 votos.",
  interpretacion: { anio: 2001, categoria: "diferencia_primero_segundo", cargo: "intendente" },
};

describe("QuestionBox", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("renderizado accesible", () => {
    it("muestra un form con label asociado, placeholder y botón de envío", () => {
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", PLACEHOLDER);
      expect(input.closest("form")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /preguntar/i })).toBeInTheDocument();
    });
  });

  describe("FR-020: pregunta vacía o solo espacios", () => {
    it("no llama a fetch y muestra una validación en el campo", async () => {
      const user = userEvent.setup();
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      await user.type(input, "   ");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        screen.getByText(/Escribí una pregunta para poder responder/i),
      ).toBeInTheDocument();
    });
  });

  describe("envío de una pregunta válida", () => {
    it("llama a POST /api/preguntar con body { pregunta } y headers JSON", async () => {
      fetchMock.mockResolvedValue(okResponse(RESPUESTA_DIFERENCIA));
      const user = userEvent.setup();
      render(<QuestionBox />);
      await user.type(screen.getByLabelText(/pregunta/i), "¿Qué diferencia de votos hubo en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      await screen.findByText(/Agrupación A/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/preguntar",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ pregunta: "¿Qué diferencia de votos hubo en 2001?" }),
        }),
      );
    });

    it("deshabilita el botón y marca aria-busy mientras está pendiente; al resolverse muestra la respuesta", async () => {
      const deferred = createDeferred<Response>();
      fetchMock.mockReturnValue(deferred.promise);
      const user = userEvent.setup();
      render(<QuestionBox />);
      const button = screen.getByRole("button", { name: /preguntar/i });
      await user.type(screen.getByLabelText(/pregunta/i), "¿Qué diferencia de votos hubo en 2001?");
      await user.click(button);
      expect(button).toBeDisabled();
      expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
      deferred.resolve(okResponse(RESPUESTA_DIFERENCIA));
      expect(await screen.findByText(/Agrupación A/)).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it("muestra la respuesta en una región role='status'", async () => {
      fetchMock.mockResolvedValue(okResponse(RESPUESTA_DIFERENCIA));
      const user = userEvent.setup();
      render(<QuestionBox />);
      await user.type(screen.getByLabelText(/pregunta/i), "¿Qué diferencia de votos hubo en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      await screen.findByText(/Agrupación A/);
      const region = screen.getByRole("status");
      expect(region).toBeInTheDocument();
      expect(region.textContent).toContain("El primer puesto fue «Agrupación A» con 21.000 votos.");
    });

    it("muestra la línea de interpretación cuando la respuesta la incluye", async () => {
      fetchMock.mockResolvedValue(okResponse(RESPUESTA_DIFERENCIA));
      const user = userEvent.setup();
      render(<QuestionBox />);
      await user.type(screen.getByLabelText(/pregunta/i), "¿Qué diferencia de votos hubo en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      await screen.findByText(/Agrupación A/);
      expect(screen.getByText(/2001/)).toBeInTheDocument();
      expect(screen.getByText(/diferencia_primero_segundo/)).toBeInTheDocument();
      expect(screen.getByText(/intendente/)).toBeInTheDocument();
    });
  });

  describe("SC-006: cada envío reemplaza la respuesta anterior", () => {
    it("la segunda respuesta reemplaza a la primera sin acumular dos respuestas", async () => {
      fetchMock
        .mockResolvedValueOnce(
          okResponse({
            tipo: "respuesta",
            texto: "Respuesta A: ganó «Agrupación A» en 2001.",
            interpretacion: { anio: 2001, categoria: "ganador", cargo: "intendente" },
          }),
        )
        .mockResolvedValueOnce(
          okResponse({
            tipo: "respuesta",
            texto: "Respuesta B: ganó «Agrupación B» en 2011.",
            interpretacion: { anio: 2011, categoria: "ganador", cargo: "intendente" },
          }),
        );
      const user = userEvent.setup();
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      const button = screen.getByRole("button", { name: /preguntar/i });
      await user.type(input, "¿Quién ganó en 2001?");
      await user.click(button);
      await screen.findByText("Respuesta A: ganó «Agrupación A» en 2001.");
      await user.clear(input);
      await user.type(input, "¿Quién ganó en 2011?");
      await user.click(button);
      await screen.findByText("Respuesta B: ganó «Agrupación B» en 2011.");
      expect(screen.queryByText("Respuesta A: ganó «Agrupación A» en 2001.")).toBeNull();
      expect(screen.getByText("Respuesta B: ganó «Agrupación B» en 2011.")).toBeInTheDocument();
    });
  });

  describe("manejo de errores", () => {
    it("muestra un mensaje amigable cuando fetch rechaza y el campo sigue usable", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      await user.type(input, "¿Quién ganó en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(await screen.findByText(/Ocurrió un error/i)).toBeInTheDocument();
      expect(input).toBeEnabled();
      fetchMock.mockResolvedValue(
        okResponse({
          tipo: "respuesta",
          texto: "Recuperado: ganó «Agrupación A» en 2001.",
          interpretacion: { anio: 2001, categoria: "ganador", cargo: "intendente" },
        }),
      );
      await user.clear(input);
      await user.type(input, "¿Quién ganó en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(await screen.findByText(/Recuperado/)).toBeInTheDocument();
    });

    it("muestra un mensaje amigable cuando el servidor responde 500", async () => {
      fetchMock.mockResolvedValueOnce(serverErrorResponse());
      const user = userEvent.setup();
      render(<QuestionBox />);
      await user.type(screen.getByLabelText(/pregunta/i), "¿Quién ganó en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(await screen.findByText(/Volvé a intentar/i)).toBeInTheDocument();
    });
  });
});
