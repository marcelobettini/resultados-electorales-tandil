import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getInterpreter } from "@/lib/interpretacion/llm-interpreter";
import {
  getRespuestaCacheada,
  setRespuestaCacheada,
} from "@/lib/seg/answer-cache";
import { checkRateLimit } from "@/lib/seg/rate-limit";
import { renderRespuesta } from "@/lib/respuestas/render";
import type { Respuesta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PREGUNTA_LENGTH = 280;

const ERROR_PREGUNTA_VACIA = {
  ok: false,
  error: {
    tipo: "pregunta_vacia",
    mensaje: "Escribí una pregunta para poder responder.",
  },
} as const;

const ERROR_PREGUNTA_LARGA = {
  ok: false,
  error: {
    tipo: "invalid_payload",
    mensaje: "La pregunta es demasiado larga. El máximo es de 280 caracteres.",
  },
} as const;

const ERROR_RATE_LIMIT = {
  ok: false,
  error: {
    tipo: "demasiadas_preguntas",
    mensaje:
      "Estás enviando muchas preguntas. Esperá unos minutos y volvé a intentar.",
  },
} as const;

const ERROR_SISTEMA = {
  ok: false,
  error: {
    tipo: "error_sistema",
    mensaje:
      "Ocurrió un error al procesar tu pregunta. Volvé a intentar en unos minutos.",
  },
} as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(ERROR_PREGUNTA_VACIA, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(ERROR_PREGUNTA_VACIA, { status: 400 });
    }

    const pregunta = (body as Record<string, unknown>).pregunta;
    if (typeof pregunta !== "string" || pregunta.trim().length === 0) {
      return NextResponse.json(ERROR_PREGUNTA_VACIA, { status: 400 });
    }
    if (pregunta.length > MAX_PREGUNTA_LENGTH) {
      return NextResponse.json(ERROR_PREGUNTA_LARGA, { status: 400 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(ERROR_RATE_LIMIT, { status: 429 });
    }

    const cacheada = getRespuestaCacheada(pregunta) as Respuesta | null;
    if (cacheada !== null) {
      return NextResponse.json({
        ok: true,
        respuesta: { ...cacheada, desde_cache: true },
      });
    }

    const intento = await getInterpreter().interpretar(pregunta);
    const respuesta: Respuesta = await renderRespuesta(intento);
    setRespuestaCacheada(pregunta, respuesta);

    return NextResponse.json({ ok: true, respuesta });
  } catch {
    return NextResponse.json(ERROR_SISTEMA, { status: 500 });
  }
}
