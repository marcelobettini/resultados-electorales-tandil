import mysql from "mysql2/promise";
import { db } from "@/lib/db";

export interface AnioTotales {
  anio: number;
  votos: number | null;
}

interface SerieRow extends mysql.RowDataPacket {
  anio: number;
  total_votos: number | null;
}

export async function serieTotalVotos(): Promise<AnioTotales[]> {
  const [rows] = await db.query<SerieRow[]>(
    `SELECT anio, total_votos
     FROM elecciones
     ORDER BY anio ASC`
  );
  return rows.map((row) => ({
    anio: row.anio,
    votos: row.total_votos,
  }));
}
