import { describe, expect, it } from "vitest";
import { nombreLegible } from "@/lib/interpretacion/taxonomy";
import {
  advertenciaTemplate,
  armarRespuesta,
  bancasTemplate,
  categoriaNoDisponibleTemplate,
  diferenciaTemplate,
  electosTemplate,
  errorSistemaTemplate,
  fueraDeAlcanceTemplate,
  ganadorTemplate,
  lineaInterpretacion,
  noEntendidaTemplate,
  rankingTemplate,
  serieTemplate,
  sinDatosTemplate,
  totalesTemplate,
  type TemplateData,
} from "@/lib/respuestas/templates";
import type { Interpretacion, Respuesta } from "@/lib/types";

function datosBase(overrides: Partial<TemplateData> = {}): TemplateData {
  return {
    anio: 2001,
    cargo: "intendente",
    categoria: "ganador_eleccion",
    ganador: { nombre: "Agrupación A", votos: 21000, porcentaje: 38.4 },
    segundo: { nombre: "Agrupación B", votos: 14500 },
    diferencia: 6500,
    empate: false,
    ranking: [
      { posicion: 1, nombre: "Agrupación A", votos: 21000 },
      { posicion: 2, nombre: "Agrupación B", votos: 14500 },
      { posicion: 3, nombre: "Agrupación C", votos: 9800 },
    ],
    totalesVotos: 21000,
    padron: 50000,
    votosPositivos: 19900,
    blancos: 700,
    nulos: 400,
    mesas: 400,
    bancas: [
      { partido: "Agrupación A", bancas: 6 },
      { partido: "Agrupación B", bancas: 4 },
    ],
    electos: [{ nombre: "Juan Pérez", partido: "Agrupación A", cargo: "concejales" }],
    serie: [
      { anio: 1991, votos: 10000 },
      { anio: 2001, votos: 21000 },
    ],
    ...overrides,
  };
}

describe("ganadorTemplate", () => {
  it("cita al ganador entre comillas españolas, sus votos formateados, el año y la palabra votos", () => {
    const texto = ganadorTemplate(datosBase());
    expect(texto).toContain("«Agrupación A»");
    expect(texto).toContain("21.000");
    expect(texto).toContain("2001");
    expect(texto).toContain("votos");
  });
});

describe("diferenciaTemplate", () => {
  it("nombra primero, segundo y la diferencia formateada", () => {
    const texto = diferenciaTemplate(datosBase());
    expect(texto).toContain("«Agrupación A»");
    expect(texto).toContain("«Agrupación B»");
    expect(texto).toContain("21.000");
    expect(texto).toContain("14.500");
    expect(texto).toContain("6.500");
  });

  it("con empate no inventa un segundo puesto", () => {
    const texto = diferenciaTemplate(
      datosBase({
        empate: true,
        segundo: null,
        diferencia: null,
        ganador: { nombre: "Agrupación A", votos: 14500, porcentaje: null },
      })
    );
    expect(texto).toMatch(/empate/i);
    expect(texto).not.toContain("«Agrupación B»");
  });
});

describe("advertenciaTemplate", () => {
  it("devuelve null para datos limpios", () => {
    expect(advertenciaTemplate(datosBase())).toBeNull();
  });

  it("avisa cuando hay empate", () => {
    expect(advertenciaTemplate(datosBase({ empate: true }))).not.toBeNull();
  });

  it("avisa cuando el ganador no tiene votos (NULL)", () => {
    expect(
      advertenciaTemplate(
        datosBase({ ganador: { nombre: "Agrupación A", votos: null, porcentaje: null } })
      )
    ).not.toBeNull();
  });

  it("no avisa cuando el ganador tiene 0 votos (0 es dato válido, no NULL)", () => {
    expect(
      advertenciaTemplate(
        datosBase({ ganador: { nombre: "Agrupación A", votos: 0, porcentaje: 0 } })
      )
    ).toBeNull();
  });
});

describe("lineaInterpretacion", () => {
  it("empieza con 'Interpreté:' e incluye año, categoría legible y cargo", () => {
    const interp: Interpretacion = {
      anio: 2001,
      categoria: "diferencia_primero_segundo",
      cargo: "intendente",
    };
    const linea = lineaInterpretacion(interp);
    expect(linea.startsWith("Interpreté:")).toBe(true);
    expect(linea).toContain("2001");
    expect(linea).toContain(nombreLegible("diferencia_primero_segundo"));
    expect(linea).toContain("intendente");
  });

  it("incluye año y categoría legible cuando no hay cargo", () => {
    const linea = lineaInterpretacion({ anio: 1991, categoria: "totales_eleccion", cargo: null });
    expect(linea).toContain("1991");
    expect(linea).toContain(nombreLegible("totales_eleccion"));
  });
});

describe("plantillas de consulta", () => {
  it("rankingTemplate contiene el año, un nombre y un total formateado", () => {
    const texto = rankingTemplate(datosBase());
    expect(texto).toContain("2001");
    expect(texto).toContain("Agrupación A");
    expect(texto).toContain("21.000");
  });

  it("totalesTemplate contiene el año y un total formateado", () => {
    const texto = totalesTemplate(datosBase());
    expect(texto).toContain("2001");
    expect(texto).toContain("21.000");
  });

  it("bancasTemplate contiene el año y un partido", () => {
    const texto = bancasTemplate(datosBase());
    expect(texto).toContain("2001");
    expect(texto).toContain("Agrupación A");
  });

  it("electosTemplate contiene el año y una persona electa", () => {
    const texto = electosTemplate(datosBase());
    expect(texto).toContain("2001");
    expect(texto).toContain("Juan Pérez");
  });

  it("serieTemplate contiene ambos años y sus totales formateados sin comparar partidos", () => {
    const texto = serieTemplate(datosBase());
    expect(texto).toContain("1991");
    expect(texto).toContain("2001");
    expect(texto).toContain("10.000");
    expect(texto).toContain("21.000");
    expect(texto).not.toMatch(/\bvs\b/i);
  });
});

describe("armarRespuesta", () => {
  it("arma una Respuesta 'respuesta' con texto, interpretación pasante y desde_cache false", () => {
    const datos = datosBase();
    const interp: Interpretacion = {
      anio: 2001,
      categoria: "ganador_eleccion",
      cargo: "intendente",
    };
    const respuesta: Respuesta = armarRespuesta("respuesta", datos, interp);
    expect(respuesta.tipo).toBe("respuesta");
    expect(respuesta.texto).toContain("Interpreté:");
    expect(respuesta.advertencia).toBeNull();
    expect(respuesta.interpretacion).toBe(interp);
    expect(respuesta.desde_cache).toBe(false);
  });

  it("propaga la advertencia cuando los datos la exigen", () => {
    const respuesta = armarRespuesta("respuesta", datosBase({ empate: true }), {
      anio: 2001,
      categoria: "ganador_eleccion",
      cargo: "intendente",
    });
    expect(respuesta.advertencia).not.toBeNull();
  });

  it("arma respuestas de rechazo con datos nulos, texto no vacío y desde_cache false", () => {
    const respuesta: Respuesta = armarRespuesta("no_entendida", null, null);
    expect(respuesta.tipo).toBe("no_entendida");
    expect(respuesta.texto.length).toBeGreaterThan(0);
    expect(respuesta.advertencia).toBeNull();
    expect(respuesta.interpretacion).toBeNull();
    expect(respuesta.desde_cache).toBe(false);
  });
});

describe("plantillas de rechazo", () => {
  it("fueraDeAlcanceTemplate(ambito_no_local) no fabrica cifras", () => {
    const texto = fueraDeAlcanceTemplate("ambito_no_local");
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/\d/);
  });

  it("noEntendidaTemplate pide reformular la pregunta", () => {
    const texto = noEntendidaTemplate();
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).toMatch(/reformul/i);
  });

  it("categoriaNoDisponibleTemplate informa que todavía no está disponible", () => {
    expect(categoriaNoDisponibleTemplate()).toMatch(/todavía no está disponible/);
  });

  it("sinDatosTemplate no es vacía", () => {
    expect(sinDatosTemplate().length).toBeGreaterThan(0);
  });

  it("errorSistemaTemplate no es vacía", () => {
    expect(errorSistemaTemplate().length).toBeGreaterThan(0);
  });
});
