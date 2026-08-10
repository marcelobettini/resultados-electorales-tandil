import mysql from "mysql2/promise";
import { db } from "@/lib/db";

export interface DiferenciaResultado {
  primero: { nombre: string; votos: number | null } | null;
  segundo: { nombre: string; votos: number | null } | null;
  diferencia: number | null;
  empate: boolean;
}

interface DiferenciaRow extends mysql.RowDataPacket {
  nombre: string;
  votos: number | null;
}

export async function diferenciaPrimeroSegundo(anio: number): Promise<DiferenciaResultado> {
  const [rows] = await db.query<DiferenciaRow[]>(
    `SELECT a.nombre, a.votos
     FROM agrupaciones a
     JOIN elecciones e ON e.id = a.eleccion_id
     WHERE e.anio = ?
     ORDER BY a.votos IS NULL ASC, a.votos DESC
     LIMIT 2`,
    [anio]
  );

  const primero = rows[0];
  if (!primero) {
    return { primero: null, segundo: null, diferencia: null, empate: false };
  }

  const segundo = rows[1] ?? null;

  const primeroVotos = primero.votos;
  const segundoVotos = segundo?.votos ?? null;

  const empate =
    primeroVotos !== null && segundoVotos !== null && primeroVotos === segundoVotos;

  const diferencia =
    primeroVotos !== null && segundoVotos !== null
      ? Math.abs(primeroVotos - segundoVotos)
      : null;

  return {
    primero: { nombre: primero.nombre, votos: primeroVotos },
    segundo: segundo ? { nombre: segundo.nombre, votos: segundoVotos } : null,
    diferencia,
    empate,
  };
}
