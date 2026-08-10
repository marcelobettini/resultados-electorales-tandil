import type { IntentoConsulta } from "@/lib/types";
import { normalizarPregunta } from "@/lib/seg/answer-cache";
import { buildIntentResponseFormat } from "./intent-schema";
import { buildSystemPrompt } from "./prompt";
import { parseIntento } from "./validate-intent";

export interface Interpreter {
  interpretar(pregunta: string): Promise<IntentoConsulta>;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODELO_DEFECTO = "gpt-4o-mini";
const SEED = 42;
const ESPERA_RETRY_MS = 500;

class LlmError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "LlmError";
  }
}

function puedeReintentar(error: LlmError): boolean {
  return error.status === undefined || error.status === 429 || error.status >= 500;
}

interface ChatBody {
  model: string;
  temperature: 0;
  seed: number;
  messages: Array<{ role: "system" | "user"; content: string }>;
  response_format: ReturnType<typeof buildIntentResponseFormat>;
}

export class LiveInterpreter implements Interpreter {
  async interpretar(pregunta: string): Promise<IntentoConsulta> {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error("LLM_API_KEY no configurada");
    }

    const body: ChatBody = {
      model: process.env.LLM_MODEL ?? MODELO_DEFECTO,
      temperature: 0,
      seed: SEED,
      messages: [
        { role: "system", content: await buildSystemPrompt() },
        { role: "user", content: pregunta },
      ],
      response_format: buildIntentResponseFormat(),
    };

    for (let intento = 0; ; intento++) {
      try {
        return await this.llamarOpenAI(apiKey, body);
      } catch (error) {
        if (!(error instanceof LlmError) || !puedeReintentar(error) || intento >= 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, ESPERA_RETRY_MS));
      }
    }
  }

  private async llamarOpenAI(apiKey: string, body: ChatBody): Promise<IntentoConsulta> {
    let respuesta: Response;
    try {
      respuesta = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new LlmError("error de red");
    }

    if (!respuesta.ok) {
      throw new LlmError(`HTTP ${respuesta.status}`, respuesta.status);
    }

    const data = (await respuesta.json()) as {
      choices?: Array<{
        message?: { content?: string | null; refusal?: string | null };
      }>;
    };
    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new LlmError("intento inválido");
    }
    if (message.refusal) {
      throw new LlmError("refusal");
    }

    let raw: unknown;
    try {
      raw =
        message.content === null || message.content === undefined
          ? null
          : JSON.parse(message.content);
    } catch {
      throw new LlmError("intento inválido");
    }

    const parsed = parseIntento(raw);
    if (!parsed.ok) {
      throw new LlmError("intento inválido");
    }
    return parsed.intento;
  }
}

const INTENTO_NO_ENTENDIDA: IntentoConsulta = {
  valido: false,
  categoria: null,
  cargo: null,
  anio: null,
  es_ultima_eleccion: false,
  limite: null,
  motivo_rechazo: "no_entendida",
};

const INTENTOS_MOCK: Array<{ pregunta: string; intento: IntentoConsulta }> = [
  {
    pregunta: "¿qué diferencia de votos hubo entre el primero y el segundo en 2001?",
    intento: {
      valido: true,
      categoria: "diferencia_primero_segundo",
      cargo: "intendente",
      anio: 2001,
      es_ultima_eleccion: false,
      limite: null,
      motivo_rechazo: null,
    },
  },
  {
    pregunta: "¿quién ganó la última elección?",
    intento: {
      valido: true,
      categoria: "ganador_eleccion",
      cargo: null,
      anio: null,
      es_ultima_eleccion: true,
      limite: null,
      motivo_rechazo: null,
    },
  },
  {
    pregunta: "¿quién ganó la intendencia en 2011?",
    intento: {
      valido: true,
      categoria: "ganador_intendencia",
      cargo: "intendente",
      anio: 2011,
      es_ultima_eleccion: false,
      limite: null,
      motivo_rechazo: null,
    },
  },
  {
    pregunta: "¿cuál fue la participación en 2011?",
    intento: {
      valido: true,
      categoria: "participacion",
      cargo: null,
      anio: 2011,
      es_ultima_eleccion: false,
      limite: null,
      motivo_rechazo: null,
    },
  },
  {
    pregunta: "¿quién ganó la gobernación de la provincia?",
    intento: {
      valido: false,
      categoria: null,
      cargo: null,
      anio: null,
      es_ultima_eleccion: false,
      limite: null,
      motivo_rechazo: "ambito_no_local",
    },
  },
];

const TABLA_MOCK: Array<{ normalizada: string; intento: IntentoConsulta }> =
  INTENTOS_MOCK.map((entrada) => ({
    normalizada: normalizarPregunta(entrada.pregunta),
    intento: entrada.intento,
  }));

export class MockInterpreter implements Interpreter {
  async interpretar(pregunta: string): Promise<IntentoConsulta> {
    const normalizada = normalizarPregunta(pregunta);
    const entrada = TABLA_MOCK.find((e) => e.normalizada === normalizada);
    return entrada ? entrada.intento : INTENTO_NO_ENTENDIDA;
  }
}

export function crearInterpreter(proveedor: "live" | "mock"): Interpreter {
  return proveedor === "mock" ? new MockInterpreter() : new LiveInterpreter();
}

export function getInterpreter(): Interpreter {
  const modo = process.env.ASK_INTERPRETER_MODE ?? "live";
  return crearInterpreter(modo === "mock" ? "mock" : "live");
}
