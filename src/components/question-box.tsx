"use client";

import { useState } from "react";
import type { CSSProperties, FormEvent, JSX } from "react";
import type { Respuesta } from "@/lib/types";

const PLACEHOLDER = "Hacé una pregunta sobre los resultados electorales…";

const MENSAJE_VALIDACION = "Escribí una pregunta para poder responder.";
const MENSAJE_ERROR =
  "Ocurrió un error al procesar tu pregunta. Volvé a intentar en unos minutos.";

interface PreguntarResponse {
  ok: boolean;
  respuesta?: Respuesta;
  error?: { tipo?: string; mensaje?: string };
}

const formStyle: CSSProperties = {
  marginTop: "3.5rem",
  padding: "1.5rem 1.75rem 1.75rem",
  border: "1px solid var(--line-strong)",
  borderLeft: "3px solid var(--tinta)",
  background: "var(--paper)",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "0.7rem",
  fontFamily: "var(--font-plexmono)",
  fontSize: "0.72rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "var(--slate)",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  font: "inherit",
  fontSize: "1.05rem",
  color: "var(--ink)",
  background: "#fff",
  border: "1.5px solid var(--line-strong)",
  padding: "0.75rem 0.9rem",
};

const buttonStyle: CSSProperties = {
  marginTop: "1rem",
  border: "1px solid var(--tinta)",
  background: "var(--tinta)",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "1rem",
  fontWeight: 700,
  padding: "0.7rem 1.5rem",
  cursor: "pointer",
};

const buttonDisabledStyle: CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const statusStyle: CSSProperties = {
  marginTop: "1.25rem",
  borderTop: "1px solid var(--line)",
  paddingTop: "1rem",
};

const answerStyle: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  lineHeight: 1.6,
};

const interpretationStyle: CSSProperties = {
  margin: "0.6rem 0 0",
  fontFamily: "var(--font-plexmono)",
  fontSize: "0.78rem",
  color: "var(--slate)",
};

const validationStyle: CSSProperties = {
  margin: "0.6rem 0 0",
  color: "#a3281f",
  fontSize: "0.9rem",
};

const errorStyle: CSSProperties = {
  marginTop: "1.25rem",
  borderLeft: "3px solid #a3281f",
  padding: "0.8rem 1rem",
  background: "var(--paper-2)",
  color: "#8a231c",
};

export default function QuestionBox(): JSX.Element {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validacion, setValidacion] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texto = pregunta.trim();
    if (texto.length === 0) {
      setValidacion(MENSAJE_VALIDACION);
      setError(null);
      return;
    }

    setValidacion(null);
    setError(null);
    setPendiente(true);

    try {
      const response = await fetch("/api/preguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: texto }),
      });

      let body: PreguntarResponse | null = null;
      try {
        body = (await response.json()) as PreguntarResponse;
      } catch {
        body = null;
      }

      if (!response.ok) {
        setError(body?.error?.mensaje ?? MENSAJE_ERROR);
        return;
      }

      if (body === null || body.ok !== true || body.respuesta === undefined) {
        setError(MENSAJE_ERROR);
        return;
      }

      setRespuesta(body.respuesta);
      setPregunta("");
    } catch {
      setError(MENSAJE_ERROR);
    } finally {
      setPendiente(false);
    }
  }

  const busy = pendiente ? "true" : undefined;
  const interpretacion = respuesta?.interpretacion;

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={busy}
      style={formStyle}
    >
      <label htmlFor="pregunta" style={labelStyle}>
        Hacé una pregunta sobre los resultados electorales
      </label>

      <input
        id="pregunta"
        name="pregunta"
        type="text"
        value={pregunta}
        onChange={(event) => {
          setPregunta(event.target.value);
          if (validacion !== null) setValidacion(null);
        }}
        placeholder={PLACEHOLDER}
        aria-describedby={validacion !== null ? "pregunta-validacion" : undefined}
        aria-invalid={validacion !== null || undefined}
        disabled={pendiente}
        autoComplete="off"
        style={inputStyle}
      />

      {validacion !== null && (
        <p id="pregunta-validacion" style={validationStyle}>
          {validacion}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        style={pendiente ? { ...buttonStyle, ...buttonDisabledStyle } : buttonStyle}
      >
        Preguntar
      </button>

      {(pendiente || respuesta !== null) && (
        <div role="status" aria-busy={busy} style={statusStyle}>
          {respuesta === null ? (
            <p style={answerStyle}>Procesando tu pregunta…</p>
          ) : (
            <>
              <p style={answerStyle}>{respuesta.texto}</p>
              {interpretacion !== undefined && interpretacion !== null && (
                <p style={interpretationStyle}>
                  Interpreté: {interpretacion.anio} · {interpretacion.categoria}
                  {interpretacion.cargo !== null
                    ? ` · ${interpretacion.cargo}`
                    : ""}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {error !== null && (
        <div role="alert" style={errorStyle}>
          {error}
        </div>
      )}
    </form>
  );
}
