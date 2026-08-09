import { expect, test } from "@playwright/test";

test.describe("Lista cronológica (portada)", () => {
  test("lista las elecciones de la BD real sin años de facto", async ({ page }) => {
    await page.goto("/");

    const list = page.locator(".election-list li");
    await expect(list.first()).toContainText("1963");
    await expect(list.last()).toContainText("2025");

    await expect(page.getByRole("link", { name: /1966/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /1972/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /1974/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /1982/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /1983/ })).toHaveCount(1);
  });
});

test.describe("Detalle de una elección", () => {
  test("muestra datos generales, una sola tabla con columnas por cargo, y electos", async ({
    page,
  }) => {
    await page.goto("/elecciones/2023");

    await expect(page.getByRole("heading", { name: "Elecciones 2023" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Datos generales" })).toBeVisible();
    await expect(page.getByText("Votos en blanco")).toBeVisible();
    await expect(page.getByText("8.358")).toBeVisible();

    // Una sola tabla de resultados con bancas por cargo
    const table = page.getByRole("table").filter({ hasText: "Resultados por partido" });
    await expect(table).toHaveCount(1);
    await expect(table.getByRole("columnheader", { name: "Intendente" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Concejales" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Consejeros Escolares" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Bancas" })).toBeVisible();
    await expect(table.getByRole("row").nth(2)).toContainText("Juntos por el Cambio");

    // Personas electas por cargo
    await expect(page.getByRole("heading", { name: "Personas electas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Intendente" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Concejales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Consejeros Escolares" })).toBeVisible();
  });

  test("una elección sin Intendente no muestra ese cargo ni su columna", async ({ page }) => {
    await page.goto("/elecciones/2025");

    await expect(page.getByRole("heading", { name: "Elecciones 2025" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Intendente" })).toHaveCount(0);

    const table = page.getByRole("table").filter({ hasText: "Resultados por partido" });
    await expect(table.getByRole("columnheader", { name: "Intendente" })).toHaveCount(0);
    await expect(table.getByRole("columnheader", { name: "Concejales" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Consejeros Escolares" })).toBeVisible();
  });

  test("elección antigua muestra guión para datos faltantes", async ({ page }) => {
    await page.goto("/elecciones/1963");

    await expect(page.getByRole("heading", { name: "Elecciones 1963" })).toBeVisible();
    const table = page.getByRole("table").filter({ hasText: "Resultados por partido" }).first();
    await expect(table.getByRole("row").first()).toContainText("Porcentaje");
  });

  test("muestra el contexto histórico de las notas de la elección", async ({ page }) => {
    await page.goto("/elecciones/1963");

    await expect(page.getByText("No hubo elección directa de Intendente")).toBeVisible();
  });
});
