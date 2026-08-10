import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const CAMPO = /hacé una pregunta/i;

async function preguntar(
  page: Page,
  pregunta: string,
  esperado: RegExp
): Promise<string> {
  const campo = page.getByLabel(CAMPO);
  await campo.fill(pregunta);
  await campo.press("Enter");

  const respuesta = page.getByRole("status");
  await expect(respuesta).toBeVisible();
  await expect(respuesta).toContainText(esperado);

  const texto = (await respuesta.textContent())?.replace(/\s+/g, " ").trim() ?? "";
  expect(texto).not.toBe("");
  return texto;
}

const RECHAZOS: Array<{ pregunta: string; motivo: string; esperado: RegExp }> = [
  {
    pregunta: "¿quién ganó la elección en azul?",
    motivo: "ambito_no_local",
    esperado: /elecciones municipales de Tandil/,
  },
  {
    pregunta: "¿quienes pasaron a la segunda vuelta en las pasó de 2015?",
    motivo: "paso",
    esperado: /elecciones generales/,
  },
  {
    pregunta: "¿cómo le fue a la ucr desde 1963?",
    motivo: "comparacion_partido_entre_anios",
    esperado: /una misma agrupación entre elecciones/,
  },
  {
    pregunta: "¿cuál es el mejor restaurante de tandil?",
    motivo: "no_entendida",
    esperado: /no entendí/i,
  },
  {
    pregunta: "¿quién ganó la gobernación de la provincia?",
    motivo: "cargo_no_local",
    esperado: /cargos municipales de Tandil/,
  },
];

test.describe("Preguntas fuera de alcance (US3 / SC-004)", () => {
  for (const caso of RECHAZOS) {
    test(`motivo ${caso.motivo}: explica el rechazo sin cifras inventadas`, async ({
      page,
    }) => {
      await page.goto("/");
      const texto = await preguntar(page, caso.pregunta, caso.esperado);
      expect(texto).not.toMatch(/\d/);
    });
  }

  test("participacion: responde que todavía no está disponible, sin cifras", async ({
    page,
  }) => {
    await page.goto("/");
    const texto = await preguntar(
      page,
      "¿cuál fue la participación en 2011?",
      /todavía no está disponible/
    );
    expect(texto).not.toMatch(/\d/);
  });

  test("pregunta confusa: pide reformular, sin cifras", async ({ page }) => {
    await page.goto("/");
    const texto = await preguntar(page, "¿por qué brilla el sol?", /reformul/i);
    expect(texto).not.toMatch(/\d/);
  });
});
