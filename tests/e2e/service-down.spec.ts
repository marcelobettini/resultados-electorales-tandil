import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// FR-021 / SC-011 — Degradación por caída del servicio de datos (BD)
// Referencia: specs/002-preguntas-lenguaje-natural/spec.md
//   FR-021: el cuadro MUST deshabilitarse con mensaje claro cuando el servicio
//           de datos no está disponible, y re-habilitarse solo al volver.
//   SC-011: con la BD caída el sistema no llama al LLM; el cuadro queda
//           deshabilitado con mensaje claro y se rehabilita solo.
//
// GROUND TRUTH:
//   - Mensaje exacto que MUST renderizar el componente cuando el servicio cae:
//         "El servicio de datos no está disponible en este momento. Volvé a
//          intentar en unos minutos."
//     (la aserción usa /El servicio de datos no está disponible/i).
//   - Selectores estables (mismos que offline.spec.ts):
//         input:   page.getByLabel(/hacé una pregunta/i)
//         botón:   page.getByRole("button", { name: "Preguntar" })
//   - La verificación de salud usa GET /api/health: al responder 503 el cuadro
//     se deshabilita; al volver a 200 se rehabilita solo (sin recargar).
// ---------------------------------------------------------------------------

test.describe("FR-021/SC-011: cuadro de preguntas con el servicio de datos caído", () => {
  test("al responder 503 /api/health el cuadro se deshabilita con mensaje claro", async ({
    page,
  }) => {
    await page.route("**/api/health", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, db: false }),
      }),
    );

    await page.goto("/");

    const input = page.getByLabel(/hacé una pregunta/i);
    const boton = page.getByRole("button", { name: "Preguntar" });
    const caja = page.locator("form").filter({ has: input });

    await expect(input).toBeDisabled({ timeout: 10_000 });
    await expect(boton).toBeDisabled();
    await expect(caja.getByText(/El servicio de datos no está disponible/i)).toBeVisible();
  });

  test("al volver 200 /api/health el cuadro se rehabilita solo, sin recargar", async ({
    page,
  }) => {
    await page.route("**/api/health", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, db: false }),
      }),
    );

    await page.goto("/");

    const input = page.getByLabel(/hacé una pregunta/i);
    await expect(input).toBeDisabled({ timeout: 10_000 });

    await page.unroute("**/api/health");
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(input).toBeEnabled({ timeout: 10_000 });
  });
});
