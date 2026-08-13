import mysql from "mysql2/promise";
import { db } from "@/lib/db";
import type { CargoLocal } from "@/lib/types";

interface AnioRow extends mysql.RowDataPacket {
  anio: number;
}

interface MaxAnioRow extends mysql.RowDataPacket {
  m: number | null;
}

interface EleccionCargosRow extends mysql.RowDataPacket {
  elige_intendente: number;
  cantidad_concejales: number | null;
  cantidad_consejeros: number | null;
}

export async function existeAnio(anio: number): Promise<boolean> {
  const [rows] = await db.query<AnioRow[]>(
    "SELECT anio FROM elecciones WHERE anio = ? LIMIT 1",
    [anio]
  );
  return rows.length > 0;
}

export async function maxAnio(): Promise<number | null> {
  const [rows] = await db.query<MaxAnioRow[]>("SELECT MAX(anio) AS m FROM elecciones");
  return rows[0]?.m ?? null;
}

export async function resolveYear(
  anio: number | null,
  esUltimaEleccion: boolean
): Promise<number | null> {
  if (esUltimaEleccion) {
    return maxAnio();
  }
  if (anio === null) {
    return null;
  }
  if (await existeAnio(anio)) {
    return anio;
  }
  return null;
}

export async function cargoElegidoEnAnio(
  cargo: CargoLocal,
  anio: number
): Promise<boolean> {
  const [rows] = await db.query<EleccionCargosRow[]>(
    "SELECT elige_intendente, cantidad_concejales, cantidad_consejeros FROM elecciones WHERE anio = ?",
    [anio]
  );
  const row = rows[0];
  if (row === undefined) {
    return false;
  }
  switch (cargo) {
    case "intendente":
      return row.elige_intendente === 1;
    case "concejales":
      return row.cantidad_concejales !== null;
    case "consejeros_escolares":
      return row.cantidad_consejeros !== null;
  }
}
