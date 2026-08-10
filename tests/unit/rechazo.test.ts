import { describe, expect, it } from "vitest";
import { renderRespuesta } from "@/lib/respuestas/render";
import {
  categoriaNoDisponibleTemplate,
  errorSistemaTemplate,
  fueraDeAlcanceTemplate,
  noEntendidaTemplate,
  sinDatosTemplate,
} from "@/lib/respuestas/templates";
import type { IntentoConsulta, MotivoRechazo } from "@/lib/types";

const MOTIVOS: MotivoRechazo[] = [
  "no_entendida",
  "ambito_no_local",
  "paso",
  "cargo_no_local",
  "comparacion_partido_entre_anios",
];

function intentoInvalido(motivo: MotivoRechazo): IntentoConsulta {
  return {
    valido: false,
    categoria: null,
    cargo: null,
    anio: null,
    es_ultima_eleccion: false,
    limite: null,
    motivo_rechazo: motivo,
  };
}

describe("fueraDeAlcanceTemplate por motivo", () => {
  it.each(MOTIVOS)(
    "devuelve texto español no vacío sin cifras fabricadas para %s",
    (motivo) => {
      const texto = fueraDeAlcanceTemplate(motivo);
      expect(texto.length).toBeGreaterThan(0);
      expect(texto).not.toMatch(/[0-9]/);
      expect(texto).toMatch(/[A-ZÁÉÍÓÚÑ]/u);
    }
  );
});

describe("renderRespuesta con intento inválido (sin BD)", () => {
  const FUERA_DE_ALCANCE: MotivoRechazo[] = [
    "ambito_no_local",
    "paso",
    "cargo_no_local",
    "comparacion_partido_entre_anios",
  ];

  it.each(FUERA_DE_ALCANCE)(
    "mapea %s a tipo fuera_de_alcance con interpretación nula y texto de referencia",
    async (motivo) => {
      const respuesta = await renderRespuesta(intentoInvalido(motivo));
      expect(respuesta.tipo).toBe("fuera_de_alcance");
      expect(respuesta.interpretacion).toBeNull();
      expect(respuesta.advertencia).toBeNull();
      expect(respuesta.desde_cache).toBe(false);
      expect(respuesta.texto).not.toMatch(/[0-9]/);
    }
  );

  it("ambito_no_local menciona Tandil y elecciones municipales", async () => {
    const respuesta = await renderRespuesta(intentoInvalido("ambito_no_local"));
    expect(respuesta.texto).toMatch(/Tandil/i);
    expect(respuesta.texto).toMatch(/municipal/i);
  });

  it("paso aclara que no hay datos de elecciones PASO", async () => {
    const respuesta = await renderRespuesta(intentoInvalido("paso"));
    expect(respuesta.texto).toMatch(/generales/i);
    expect(respuesta.texto).toMatch(/PASO/);
  });

  it("cargo_no_local menciona Tandil y los cargos municipales", async () => {
    const respuesta = await renderRespuesta(intentoInvalido("cargo_no_local"));
    expect(respuesta.texto).toMatch(/Tandil/i);
    expect(respuesta.texto).toMatch(/municipal/i);
  });

  it("comparacion_partido_entre_anios explica que se responde una elección a la vez", async () => {
    const respuesta = await renderRespuesta(intentoInvalido("comparacion_partido_entre_anios"));
    expect(respuesta.texto).toMatch(/agrupación/i);
    expect(respuesta.texto).toMatch(/una elección a la vez/i);
  });

  it("mapea no_entendida a tipo no_entendida pidiendo reformular", async () => {
    const respuesta = await renderRespuesta(intentoInvalido("no_entendida"));
    expect(respuesta.tipo).toBe("no_entendida");
    expect(respuesta.interpretacion).toBeNull();
    expect(respuesta.advertencia).toBeNull();
    expect(respuesta.texto).toMatch(/No entendí/i);
    expect(respuesta.texto).toMatch(/reformul/i);
    expect(respuesta.texto).not.toMatch(/[0-9]/);
  });
});

describe("categoria_no_disponible (participacion)", () => {
  it("categoriaNoDisponibleTemplate informa que todavía no está disponible sin cifras", () => {
    const texto = categoriaNoDisponibleTemplate();
    expect(texto).toContain("todavía no está disponible");
    expect(texto).not.toMatch(/[0-9]/);
  });

  it("renderRespuesta con participacion responde categoria_no_disponible antes de resolver el año", async () => {
    const intento: IntentoConsulta = {
      valido: true,
      categoria: "participacion",
      cargo: null,
      anio: 2011,
      es_ultima_eleccion: false,
      limite: null,
      motivo_rechazo: null,
    };
    const respuesta = await renderRespuesta(intento);
    expect(respuesta.tipo).toBe("categoria_no_disponible");
    expect(respuesta.interpretacion).toBeNull();
    expect(respuesta.advertencia).toBeNull();
    expect(respuesta.texto).toContain("todavía no está disponible");
    expect(respuesta.texto).not.toMatch(/[0-9]/);
  });
});

describe("sinDatosTemplate y errorSistemaTemplate", () => {
  it("sinDatosTemplate no es vacía ni fabrica cifras", () => {
    const texto = sinDatosTemplate();
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/[0-9]/);
  });

  it("errorSistemaTemplate no es vacía ni fabrica cifras", () => {
    const texto = errorSistemaTemplate();
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/[0-9]/);
  });
});

describe("SC-004: ninguna plantilla de rechazo fabrica cifras", () => {
  const PLANTILLAS: Array<[string, () => string]> = [
    ...MOTIVOS.map<[string, () => string]>((motivo) => [
      `fueraDeAlcanceTemplate(${motivo})`,
      () => fueraDeAlcanceTemplate(motivo),
    ]),
    ["noEntendidaTemplate", noEntendidaTemplate],
    ["categoriaNoDisponibleTemplate", categoriaNoDisponibleTemplate],
    ["sinDatosTemplate", sinDatosTemplate],
    ["errorSistemaTemplate", errorSistemaTemplate],
  ];

  it.each(PLANTILLAS)("%s no contiene dígitos (honestidad SC-004)", (_nombre, plantilla) => {
    expect(plantilla().length).toBeGreaterThan(0);
    expect(plantilla()).not.toMatch(/[0-9]/);
  });
});
