import mysql from "mysql2/promise";
import { db } from "@/lib/db";
import type { CargoLocal } from "@/lib/types";

const BANCA_COLUMN: Record<CargoLocal, string> = {
  intendente: "obtuvo_intendencia",
  concejales: "concejales_obtenidos",
  consejeros_escolares: "consejeros_obtenidos",
};

export interface BancaPartido {
  partido: string;
  bancas: number;
}

interface BancaRow extends mysql.RowDataPacket {
  partido: string;
  bancas: number;
}

export async function bancasPorCargo(anio: number, cargo: CargoLocal): Promise<BancaPartido[]> {
  const col = BANCA_COLUMN[cargo];
  const [rows] = await db.query<BancaRow[]>(
    `SELECT a.nombre AS partido, a.${col} AS bancas
     FROM agrupaciones a
     JOIN elecciones e ON e.id = a.eleccion_id
     WHERE e.anio = ? AND a.${col} > 0
     ORDER BY bancas DESC, a.nombre ASC`,
    [anio]
  );
  return rows.map((row) => ({
    partido: row.partido,
    bancas: Number(row.bancas),
  }));
}
