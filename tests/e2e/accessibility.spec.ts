import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AA_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AA_TAGS).analyze();
  const mensajes = results.violations.map((v) => `${v.id}: ${v.help}`).join("\n");
  expect(mensajes, mensajes).toBe("");
}

test.describe("Accesibilidad WCAG AA", () => {
  test("todas las páginas (lista, detalle con/sin intendente, offline) sin violaciones AA", async ({
    page,
  }) => {
    for (const path of [
      "/",
      "/elecciones/1963",
      "/elecciones/2023",
      "/elecciones/2025",
      "/offline",
    ]) {
      await page.goto(path);
      await expectNoViolations(page);
    }
  });

  test("la portada no tiene violaciones AA", async ({ page }) => {
    await page.goto("/");
    await expectNoViolations(page);
  });

  test("una eleccion con 10+ frentes no tiene violaciones AA y es legible sin los graficos", async ({
    page,
  }) => {
    await page.goto("/elecciones/2001");

    const tabla = page.getByRole("table").filter({ hasText: "Resultados por partido" }).first();
    await expect(tabla.getByRole("row").first()).toBeVisible();
    const filas = await tabla.getByRole("row").count();
    expect(filas).toBeGreaterThanOrEqual(21);

    await expect(page.getByText("Comparación de votos").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personas electas" }).first()).toBeVisible();

    await expectNoViolations(page);
  });

  test("la vista móvil de una elección no tiene violaciones AA", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/elecciones/2023");
    await expectNoViolations(page);
  });

  test("SC-005: el cuadro de preguntas no tiene violaciones AA en cargando, respuesta y validación", async ({
    page,
  }) => {
    await page.route("**/api/preguntar", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    await page.goto("/");
    await expectNoViolations(page);

    const pregunta = page.getByLabel(/hacé una pregunta/i);
    await pregunta.fill("¿Quién ganó la última elección?");
    await pregunta.press("Enter");

    const estado = page.getByRole("status");
    await expect(estado).toBeVisible();
    await expect(estado).toContainText("Procesando tu pregunta");
    await expectNoViolations(page);

    await expect(estado).toContainText("Interpreté:");
    await expect(estado).toContainText("2025");
    await expectNoViolations(page);

    await pregunta.fill("   ");
    await pregunta.press("Enter");
    await expect(page.getByText(/Escribí una pregunta/)).toBeVisible();
    await expectNoViolations(page);
  });
});
