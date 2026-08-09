import { unstable_cache } from "next/cache";
import mysql from "mysql2/promise";
import { db } from "@/lib/db";
import type { Eleccion } from "@/lib/types";

export const LIST_TAG = "elections:list";
export const ELECTION_TAG_PREFIX = "election:";

export function electionTag(year: number): string {
  return `${ELECTION_TAG_PREFIX}${year}`;
}

interface EleccionRow extends mysql.RowDataPacket {
  id: number;
  anio: number;
  fecha: string | null;
  elige_intendente: number;
  cantidad_concejales: number | null;
  cantidad_consejeros: number | null;
  electores_habilitados: number | null;
  total_mesas: number | null;
  votos_positivos: number | null;
  votos_blanco: number | null;
  votos_nulos: number | null;
  notas: string | null;
  url_pdf: string | null;
}

const ELECCION_COLUMNS = `
  id, anio, fecha, elige_intendente, cantidad_concejales, cantidad_consejeros,
  electores_habilitados, total_mesas,
  votos_positivos, votos_blanco, votos_nulos, notas, url_pdf
`;

function mapEleccion(row: EleccionRow): Eleccion {
  return {
    id: row.id,
    anio: row.anio,
    fecha: row.fecha,
    elige_intendente: row.elige_intendente === 1,
    cantidad_concejales: row.cantidad_concejales,
    cantidad_consejeros: row.cantidad_consejeros,
    electores_habilitados: row.electores_habilitados,
    total_mesas: row.total_mesas,
    votos_positivos: row.votos_positivos,
    votos_blanco: row.votos_blanco,
    votos_nulos: row.votos_nulos,
    notas: row.notas,
    url_pdf: row.url_pdf,
  };
}

async function fetchEleccionesList(): Promise<Eleccion[]> {
  const [rows] = await db.query<EleccionRow[]>(
    `SELECT ${ELECCION_COLUMNS} FROM elecciones ORDER BY anio ASC`
  );
  return rows.map(mapEleccion);
}

export const getEleccionesList = unstable_cache(fetchEleccionesList, ["elecciones-list"], {
  revalidate: 3600,
  tags: [LIST_TAG],
});

async function fetchEleccionByYear(year: number): Promise<Eleccion | null> {
  const [rows] = await db.query<EleccionRow[]>(
    `SELECT ${ELECCION_COLUMNS} FROM elecciones WHERE anio = ? LIMIT 1`,
    [year]
  );
  const row = rows[0];
  return row ? mapEleccion(row) : null;
}

export function getEleccionByYear(year: number): Promise<Eleccion | null> {
  return unstable_cache(fetchEleccionByYear, [`eleccion-by-year-${year}`], {
    revalidate: 3600,
    tags: [electionTag(year)],
  })(year);
}

/** Todos los años existentes (sin cache: usado por revalidación on-demand/cron). */
export async function getAllElectionYears(): Promise<number[]> {
  const [rows] = await db.query<Array<{ anio: number } & mysql.RowDataPacket>>(
    "SELECT anio FROM elecciones ORDER BY anio ASC"
  );
  return rows.map((r) => r.anio);
}

/** Última modificación de la tabla `elecciones` (para el cron de conciliación). */
export async function getLastUpdatedAt(): Promise<Date | null> {
  const [rows] = await db.query<Array<{ last_update: string | null } & mysql.RowDataPacket>>(
    "SELECT MAX(actualizado_en) AS last_update FROM elecciones"
  );
  const value = rows[0]?.last_update;
  return value ? new Date(value) : null;
}

/** Años modificados después de `after` (para el cron de conciliación). */
export async function getChangedElectionYears(after: Date): Promise<number[]> {
  const [rows] = await db.query<Array<{ anio: number } & mysql.RowDataPacket>>(
    "SELECT anio FROM elecciones WHERE actualizado_en >= ? ORDER BY anio ASC",
    [after]
  );
  return rows.map((r) => r.anio);
}
