import { expect, test, type Page } from "@playwright/test";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PREGUNTA_VOTOS = "¿Cuántos votos sacó el Partido Justicialista en 2001?";
const PREGUNTA_PARTICIPO = "¿Participó el Partido Justicialista en 2001?";
const PREGUNTA_SERIE = "¿En qué elecciones participó la Unión Cívica Radical?";
const PREGUNTA_PERSONA = "¿En qué años fue electo Miguel Lunghi?";
const PREGUNTA_PERSONA_AMBIGUA = "¿Cuántas veces fue elegido Lunghi?";
const PREGUNTA_PARTICIPACION = "¿Cuál fue la participación en 2011?";

interface VotosRow extends mysql.RowDataPacket {
  votos: number | null;
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

async function votosPartidoJusticialista2001(): Promise<number> {
  const conexion = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await conexion.query<VotosRow[]>(
      `SELECT a.votos
       FROM agrupaciones a
       JOIN elecciones e ON e.id = a.eleccion_id
       WHERE e.anio = 2001 AND a.nombre = 'Partido Justicialista'`
    );
    const votos = rows[0]?.votos;
    if (votos === null || votos === undefined) {
      throw new Error("Fixture inválida: no hay votos del Partido Justicialista en 2001.");
    }
    return Number(votos);
  } finally {
    await conexion.end();
  }
}

async function preguntaAsync(page: Page, pregunta: string) {
  const campo = page.getByLabel(/hacé una pregunta/i);
  await campo.fill(pregunta);
  await campo.press("Enter");
  return page.getByRole("status");
}

test.describe("Categorías de entidad (agrupaciones y personas) en la portada", () => {
  test("votos_agrupacion responde con los votos reales de la agrupación y la línea Interpreté", async ({
    page,
  }) => {
    const votosEsperados = await votosPartidoJusticialista2001();
    const cifra = votosEsperados.toLocaleString("es-AR");

    await page.goto("/");
    const respuesta = await preguntaAsync(page, PREGUNTA_VOTOS);

    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("Partido Justicialista");
    await expect(respuesta).toContainText("obtuvo");
    await expect(respuesta).toContainText(cifra);
    await expect(respuesta).toContainText("Interpreté:");
    await expect(respuesta).toContainText("de 2001");
  });

  test("participacion_agrupacion confirma si una agrupación compitió en un año", async ({ page }) => {
    await page.goto("/");
    const respuesta = await preguntaAsync(page, PREGUNTA_PARTICIPO);

    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("Sí");
    await expect(respuesta).toContainText("Partido Justicialista");
    await expect(respuesta).toContainText("participó");
    await expect(respuesta).toContainText("2001");
    await expect(respuesta).toContainText("Interpreté:");
  });

  test("serie_agrupacion devuelve el historial de la agrupación sin resolver año", async ({
    page,
  }) => {
    await page.goto("/");
    const respuesta = await preguntaAsync(page, PREGUNTA_SERIE);

    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("participó en");
    await expect(respuesta).toContainText("Union Civica Radical");
    await expect(respuesta).toContainText("Interpreté:");
  });

  test("historial_persona responde los cargos en los que resultó electa una persona", async ({
    page,
  }) => {
    await page.goto("/");
    const respuesta = await preguntaAsync(page, PREGUNTA_PERSONA);

    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("resultó electo");
    await expect(respuesta).toContainText("intendente");
    await expect(respuesta).toContainText("concejal");
    await expect(respuesta).toContainText("1987");
    await expect(respuesta).toContainText("Interpreté:");
  });

  test("historial_persona con apellido ambiguo lista todos los candidatos y sus cargos", async ({
    page,
  }) => {
    await page.goto("/");
    const respuesta = await preguntaAsync(page, PREGUNTA_PERSONA_AMBIGUA);

    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("¿A cuál te referís?");
    await expect(respuesta).toContainText("LUNGHI, José Emilio");
    await expect(respuesta).toContainText("LUNGHI, Miguel Angel");
    await expect(respuesta).toContainText("LUNGHI, Jose Luis");
    await expect(respuesta).toContainText("LUNGHI, Sergio Luis");
  });

  test("participacion responde con el porcentaje real del padrón", async ({ page }) => {
    await page.goto("/");
    const respuesta = await preguntaAsync(page, PREGUNTA_PARTICIPACION);

    await expect(respuesta).toBeVisible();
    await expect(respuesta).toContainText("2011");
    await expect(respuesta).toContainText(/%\s*del padrón/);
    await expect(respuesta).toContainText("Interpreté:");
  });
});
