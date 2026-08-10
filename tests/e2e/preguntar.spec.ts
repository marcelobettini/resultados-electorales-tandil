import { expect, test } from "@playwright/test";

const PREGUNTA_DIFERENCIA_2001 =
  "¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?";
const PREGUNTA_ULTIMA_ELECCION = "¿Quién ganó la última elección?";

test.describe("Cuadro de preguntas en lenguaje natural (portada)", () => {
  test("US1: una pregunta válida responde con cifras de la base y la línea Interpreté", async ({
    page,
  }) => {
    await page.goto("/");

    const pregunta = page.getByLabel(/hacé una pregunta/i);
    await pregunta.fill(PREGUNTA_DIFERENCIA_2001);
    await pregunta.press("Enter");

    const respuesta = page.getByRole("status");
    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("2001");
    await expect(respuesta).toContainText("Interpreté:");
    await expect(respuesta).toContainText(/\d/);
  });

  test("FR-018/SC-009: repetir la misma pregunta vuelve a responder desde la memoria temporal", async ({
    page,
  }) => {
    await page.goto("/");

    const pregunta = page.getByLabel(/hacé una pregunta/i);
    const respuesta = page.getByRole("status");

    await pregunta.fill(PREGUNTA_DIFERENCIA_2001);
    await pregunta.press("Enter");
    await expect(respuesta).toContainText("Interpreté:");

    await pregunta.fill(PREGUNTA_DIFERENCIA_2001);
    await pregunta.press("Enter");
    await expect(respuesta).toContainText("Interpreté:");
    await expect(respuesta).toContainText("2001");
  });

  test("SC-006: cada envío reemplaza por completo la respuesta anterior", async ({ page }) => {
    await page.goto("/");

    const pregunta = page.getByLabel(/hacé una pregunta/i);
    const respuesta = page.getByRole("status");

    await pregunta.fill(PREGUNTA_DIFERENCIA_2001);
    await pregunta.press("Enter");
    await expect(respuesta).toContainText("Interpreté:");
    const primera = (await respuesta.textContent())?.replace(/\s+/g, " ").trim() ?? "";

    await pregunta.fill(PREGUNTA_ULTIMA_ELECCION);
    await pregunta.press("Enter");
    await expect(respuesta).toContainText("Interpreté:");

    expect(primera).not.toBe("");
    await expect(page.getByText(primera)).toHaveCount(0);
  });

  test("FR-020: pregunta vacía muestra validación y no produce respuesta", async ({ page }) => {
    await page.goto("/");

    const pregunta = page.getByLabel(/hacé una pregunta/i);
    await pregunta.fill("   ");
    await pregunta.press("Enter");

    await expect(page.getByText(/Escribí una pregunta/)).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("el cuadro no rompe el resto de la portada", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Resultados electorales de Tandil" }),
    ).toBeVisible();

    const list = page.locator(".election-list li");
    await expect(list.first()).toContainText("1963");
    await expect(list.last()).toContainText("2025");
  });
});
