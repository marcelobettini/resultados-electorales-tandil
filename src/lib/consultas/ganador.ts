import mysql from "mysql2/promise";
import { db } from "@/lib/db";

export interface GanadorInfo {
  nombre: string;
  votos: number | null;
  porcentaje: number | null;
}

interface GanadorRow extends mysql.RowDataPacket {
  nombre: string;
  votos: number | null;
  porcentaje: string | null;
}

async function fetchGanador(
  anio: number,
  soloIntendencia: boolean
): Promise<GanadorInfo | null> {
  const [rows] = await db.query<GanadorRow[]>(
    `SELECT a.nombre, a.votos, a.porcentaje
     FROM agrupaciones a
     JOIN elecciones e ON e.id = a.eleccion_id
     WHERE e.anio = ?
     ${soloIntendencia ? "AND a.obtuvo_intendencia = 1" : ""}
     ORDER BY a.votos IS NULL ASC, a.votos DESC
     LIMIT 1`,
    [anio]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    nombre: row.nombre,
    votos: row.votos,
    porcentaje: row.porcentaje === null ? null : Number(row.porcentaje),
  };
}

export async function ganadorEleccion(anio: number): Promise<GanadorInfo | null> {
  return fetchGanador(anio, false);
}

export async function ganadorIntendencia(anio: number): Promise<GanadorInfo | null> {
  return fetchGanador(anio, true);
}
