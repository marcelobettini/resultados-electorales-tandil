import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// FR-015 / SC-008 — Cuadro de preguntas en modo sin conexión
// Referencia: specs/002-preguntas-lenguaje-natural/spec.md
//   FR-015: "El cuadro de pregunta MUST deshabilitarse en modo sin conexión
//           (offline de la PWA) con un mensaje claro, sin romper el resto de la plataforma."
//   SC-008: "En modo sin conexión, el cuadro de pregunta queda deshabilitado con
//           mensaje claro y el resto de la plataforma (histórico, tablas, PDFs)
//           continúa funcionando sin regresión."
//
// GROUND TRUTH (para la tarea de implementación — este test verifica contra esto):
//   - Copia exacta del mensaje offline que MUST renderizar el componente:
//         "Estás sin conexión. Volvé a conectarte para hacer una pregunta."
//     (la aserción de texto usa /sin conexión/i, pero la copia completa debe ser la anterior).
//   - Selectores estables:
//         input:   page.getByLabel(/hacé una pregunta/i)  (es el <input id="pregunta">)
//         botón:   page.getByRole("button", { name: "Preguntar" })
//         mensaje: dentro del <form> del cuadro (page.locator("form").filter({ has: input }))
//   - La deshabilitación MUST ocurrir al dispararse el evento `offline` del navegador
//     (window.addEventListener("offline", ...)) y la re-habilitación con el evento `online`;
//     NO debe requerirse recarga, clic ni interacción.
// ---------------------------------------------------------------------------

test.describe("FR-015/SC-008: cuadro de preguntas sin conexión", () => {
  test("en línea el cuadro está habilitado por defecto", async ({ page }) => {
    await page.goto("/");

    const input = page.getByLabel(/hacé una pregunta/i);
    const boton = page.getByRole("button", { name: "Preguntar" });

    await expect(input).toBeEnabled();
    await expect(boton).toBeEnabled();
  });

  test("offline deshabilita el cuadro y muestra el mensaje claro", async ({ page }) => {
    await page.goto("/");

    const input = page.getByLabel(/hacé una pregunta/i);
    const caja = page.locator("form").filter({ has: input });

    await page.context().setOffline(true);

    await expect(input).toBeDisabled({ timeout: 10_000 });
    await expect(caja.getByText(/sin conexión/i)).toBeVisible();
  });

  test("offline: el resto de la plataforma sigue funcionando", async ({ page }) => {
    await page.goto("/");

    await page.context().setOffline(true);

    await expect(
      page.getByRole("heading", { name: "Resultados electorales de Tandil" }),
    ).toBeVisible();

    const list = page.locator(".election-list");
    await expect(list).toBeVisible();
    await expect(list.locator("li").first()).toContainText("1963");
    await expect(list.locator("li").last()).toContainText("2025");
  });

  test("al volver online el cuadro se re-habilita solo, sin recargar", async ({ page }) => {
    await page.goto("/");

    const input = page.getByLabel(/hacé una pregunta/i);
    const caja = page.locator("form").filter({ has: input });

    await page.context().setOffline(true);
    await expect(input).toBeDisabled({ timeout: 10_000 });

    await page.context().setOffline(false);

    await expect(input).toBeEnabled({ timeout: 10_000 });
    await expect(caja.getByText(/sin conexión/i)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Resultados electorales de Tandil" }),
    ).toBeVisible();
  });

  test("offline: no se puede enviar y no hay intento de fetch", async ({ page }) => {
    await page.goto("/");

    const input = page.getByLabel(/hacé una pregunta/i);
    const boton = page.getByRole("button", { name: "Preguntar" });

    const fetchAttempts: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/preguntar")) fetchAttempts.push(request.url());
    });

    await page.context().setOffline(true);
    await expect(input).toBeDisabled({ timeout: 10_000 });
    await expect(boton).toBeDisabled();

    await input.fill("¿Quién ganó la última elección?", { timeout: 2_000 }).catch(() => {});
    await Promise.race([
      page.keyboard.press("Enter"),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);

    expect(fetchAttempts).toHaveLength(0);
  });
});
