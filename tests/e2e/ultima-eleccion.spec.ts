import { expect, test } from "@playwright/test";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PREGUNTA_ULTIMA_ELECCION = "¿Quién ganó la última elección?";

interface MaxAnioRow extends mysql.RowDataPacket {
  m: number | null;
}

function leerDotEnv(): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const contenido = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const linea of contenido.split("\n")) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(linea);
      if (match) {
        vars[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Sin .env: se usan los defaults de src/lib/db.ts.
  }
  return vars;
}

const dotEnv = leerDotEnv();

const dbConfig = {
  host: process.env.DB_HOST ?? dotEnv.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? dotEnv.DB_PORT ?? 8889),
  user: process.env.DB_USER ?? dotEnv.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? dotEnv.DB_PASSWORD ?? "root",
  database: process.env.DB_NAME ?? dotEnv.DB_NAME ?? "resultados_tandil",
};

// El año esperado se lee de la base (SELECT MAX(anio)) en vez de hardcodearlo,
// igual que src/lib/consultas/years.ts lo resuelve del lado del servidor.
async function maxAnioEnBase(): Promise<number> {
  const conexion = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await conexion.query<MaxAnioRow[]>(
      "SELECT MAX(anio) AS m FROM elecciones"
    );
    const max = rows[0]?.m;
    if (max === null || max === undefined) {
      throw new Error("Fixture inválida: no hay elecciones en la BD local.");
    }
    return Number(max);
  } finally {
    await conexion.end();
  }
}

test.describe("Cuadro de preguntas en lenguaje natural (portada)", () => {
  test("US2: la última elección responde con el año más reciente de la base y cifras reales", async ({
    page,
  }) => {
    const anioEsperado = await maxAnioEnBase();

    await page.goto("/");

    const pregunta = page.getByLabel(/hacé una pregunta/i);
    await pregunta.fill(PREGUNTA_ULTIMA_ELECCION);
    await pregunta.press("Enter");

    const respuesta = page.getByRole("status");
    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("Interpreté:");
    await expect(respuesta).toContainText(String(anioEsperado));
    await expect(respuesta).toContainText("votos");

    const texto = ((await respuesta.textContent()) ?? "").replace(/\s+/g, " ");
    const aniosMencionados = (texto.match(/\b\d{4}\b/g) ?? []).map(Number);
    expect(aniosMencionados.length).toBeGreaterThan(0);
    for (const anio of aniosMencionados) {
      expect(anio).toBeLessThanOrEqual(anioEsperado);
    }
  });
});
