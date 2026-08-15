import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionBox from "@/components/question-box";

const PLACEHOLDER = "Quién ganó en 1999... Cuántos concejales obtuvo el ganador en 1989...";

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

function healthOkResponse(): Response {
  return new Response(JSON.stringify({ ok: true, db: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function healthDownResponse(): Response {
  return new Response(JSON.stringify({ ok: false, db: false }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

const RESPUESTA_DIFERENCIA = {
  tipo: "respuesta",
  texto: "El primer puesto fue «Agrupación A» con 21.000 votos.",
  interpretacion: { anio: 2001, categoria: "diferencia_primero_segundo", cargo: "intendente" },
};

describe("QuestionBox", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  function preguntarCalls(): unknown[][] {
    return fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/preguntar"),
    );
  }

  function mockPreguntar(respuesta: Record<string, unknown>) {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/health")) return Promise.resolve(healthOkResponse());
      return Promise.resolve(okResponse(respuesta));
    });
  }

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/health")) return Promise.resolve(healthOkResponse());
      return Promise.resolve(serverErrorResponse());
    });
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
    it("no envía la pregunta y muestra una validación en el campo", async () => {
      const user = userEvent.setup();
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      await user.type(input, "   ");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(preguntarCalls()).toHaveLength(0);
      expect(
        screen.getByText(/Escribí una pregunta para poder responder/i),
      ).toBeInTheDocument();
    });
  });

  describe("envío de una pregunta válida", () => {
    it("llama a POST /api/preguntar con body { pregunta } y headers JSON", async () => {
      mockPreguntar(RESPUESTA_DIFERENCIA);
      const user = userEvent.setup();
      render(<QuestionBox />);
      await user.type(screen.getByLabelText(/pregunta/i), "¿Qué diferencia de votos hubo en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      await screen.findByText(/Agrupación A/);
      expect(preguntarCalls()).toHaveLength(1);
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
      fetchMock.mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/health")) return Promise.resolve(healthOkResponse());
        return deferred.promise;
      });
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
      mockPreguntar(RESPUESTA_DIFERENCIA);
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
      mockPreguntar(RESPUESTA_DIFERENCIA);
      const user = userEvent.setup();
      render(<QuestionBox />);
      await user.type(screen.getByLabelText(/pregunta/i), "¿Qué diferencia de votos hubo en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      await screen.findByText(/Agrupación A/);
      expect(screen.getByText(/2001/)).toBeInTheDocument();
      expect(screen.getByText(/diferencia entre el primero y el segundo/)).toBeInTheDocument();
      expect(screen.getByText(/intendente/)).toBeInTheDocument();
    });
  });

  describe("SC-006: cada envío reemplaza la respuesta anterior", () => {
    it("la segunda respuesta reemplaza a la primera sin acumular dos respuestas", async () => {
      let n = 0;
      fetchMock.mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/health")) return Promise.resolve(healthOkResponse());
        n += 1;
        return Promise.resolve(
          n === 1
            ? okResponse({
                tipo: "respuesta",
                texto: "Respuesta A: ganó «Agrupación A» en 2001.",
                interpretacion: { anio: 2001, categoria: "ganador_eleccion", cargo: "intendente" },
              })
            : okResponse({
                tipo: "respuesta",
                texto: "Respuesta B: ganó «Agrupación B» en 2011.",
                interpretacion: { anio: 2011, categoria: "ganador_eleccion", cargo: "intendente" },
              }),
        );
      });
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
      fetchMock.mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/health")) return Promise.resolve(healthOkResponse());
        return Promise.reject(new Error("network down"));
      });
      const user = userEvent.setup();
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      await user.type(input, "¿Quién ganó en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(await screen.findByText(/Ocurrió un error/i)).toBeInTheDocument();
      expect(input).toBeEnabled();
      mockPreguntar({
        tipo: "respuesta",
        texto: "Recuperado: ganó «Agrupación A» en 2001.",
        interpretacion: { anio: 2001, categoria: "ganador_eleccion", cargo: "intendente" },
      });
      await user.clear(input);
      await user.type(input, "¿Quién ganó en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(await screen.findByText(/Recuperado/)).toBeInTheDocument();
    });

    it("muestra un mensaje amigable cuando el servidor responde 500", async () => {
      const user = userEvent.setup();
      render(<QuestionBox />);
      await user.type(screen.getByLabelText(/pregunta/i), "¿Quién ganó en 2001?");
      await user.click(screen.getByRole("button", { name: /preguntar/i }));
      expect(await screen.findByText(/Volvé a intentar/i)).toBeInTheDocument();
    });
  });

  describe("FR-021: servicio de datos caído", () => {
    it("deshabilita el cuadro y muestra un mensaje claro cuando /api/health responde 503", async () => {
      fetchMock.mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/health")) return Promise.resolve(healthDownResponse());
        return Promise.resolve(serverErrorResponse());
      });
      const user = userEvent.setup();
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      const button = screen.getByRole("button", { name: /preguntar/i });
      await waitFor(() => expect(input).toBeDisabled());
      expect(button).toBeDisabled();
      expect(
        screen.getByText(/El servicio de datos no está disponible/i),
      ).toBeInTheDocument();
      await user.type(input, "¿Quién ganó en 2001?").catch(() => {});
      await user.click(button).catch(() => {});
      expect(preguntarCalls()).toHaveLength(0);
    });

    it("se rehabilita solo cuando /api/health vuelve a responder 200", async () => {
      let healthCalls = 0;
      fetchMock.mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/health")) {
          healthCalls += 1;
          return Promise.resolve(healthCalls === 1 ? healthDownResponse() : healthOkResponse());
        }
        return Promise.resolve(serverErrorResponse());
      });
      render(<QuestionBox />);
      const input = screen.getByLabelText(/pregunta/i);
      await waitFor(() => expect(input).toBeDisabled());
      window.dispatchEvent(new Event("online"));
      await waitFor(() => expect(input).toBeEnabled());
    });
  });
});
