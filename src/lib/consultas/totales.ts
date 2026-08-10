import mysql from "mysql2/promise";
import { db } from "@/lib/db";

export interface TotalesAnio {
  votantes: number | null;
  padron: number | null;
  votosPositivos: number | null;
  blancos: number | null;
  nulos: number | null;
  mesas: number | null;
}

interface TotalesRow extends mysql.RowDataPacket {
  total_votos: number | null;
  electores_habilitados: number | null;
  votos_positivos: number | null;
  votos_blanco: number | null;
  votos_nulos: number | null;
  total_mesas: number | null;
}

export async function totalesPorAnio(anio: number): Promise<TotalesAnio | null> {
  const [rows] = await db.query<TotalesRow[]>(
    `SELECT total_votos, electores_habilitados, votos_positivos, votos_blanco,
            votos_nulos, total_mesas
     FROM elecciones
     WHERE anio = ?`,
    [anio]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    votantes: row.total_votos,
    padron: row.electores_habilitados,
    votosPositivos: row.votos_positivos,
    blancos: row.votos_blanco,
    nulos: row.votos_nulos,
    mesas: row.total_mesas,
  };
}
