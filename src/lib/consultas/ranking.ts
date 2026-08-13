import mysql from "mysql2/promise";
import { db } from "@/lib/db";

export interface RankingItem {
  posicion: number;
  nombre: string;
  votos: number | null;
}

interface RankingRow extends mysql.RowDataPacket {
  nombre: string;
  votos: number | null;
}

export async function rankingTop(anio: number, limite: number): Promise<RankingItem[]> {
  const [rows] = await db.query<RankingRow[]>(
    `SELECT a.nombre, a.votos
     FROM agrupaciones a
     JOIN elecciones e ON e.id = a.eleccion_id
     WHERE e.anio = ?
     ORDER BY a.votos IS NULL ASC, a.votos DESC
     LIMIT ?`,
    [anio, limite]
  );
  return rows.map((row, index) => ({
    posicion: index + 1,
    nombre: row.nombre,
    votos: row.votos,
  }));
}
