import { expect, test } from "@playwright/test";

test.describe("Descarga del PDF oficial (US3)", () => {
  test("una elección con PDF muestra el enlace externo con target blank y rel noreferrer", async ({
    page,
  }) => {
    await page.goto("/elecciones/2001");

    const link = page.getByRole("link", { name: /Descargar acta oficial \(PDF\)/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noreferrer");

    const href = (await link.getAttribute("href")) ?? "";
    expect(href).toMatch(/^https?:\/\//);

    const nuevoContexto = await page.context().newPage();
    await nuevoContexto.goto(href);
    expect(nuevoContexto.url()).toMatch(/^https:\/\//);
    await nuevoContexto.close();
  });

  test("el enlace PDF se muestra en otra elección con PDF (2025)", async ({ page }) => {
    await page.goto("/elecciones/2025");

    const link = page.getByRole("link", { name: /Descargar acta oficial \(PDF\)/ });
    await expect(link).toBeVisible();
    expect((await link.getAttribute("href")) ?? "").toMatch(/^https?:\/\//);
  });
});
