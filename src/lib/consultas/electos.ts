import mysql from "mysql2/promise";
import { db } from "@/lib/db";
import type { CargoLocal } from "@/lib/types";

const CARGO_ENUM: Record<CargoLocal, "INTENDENTE" | "CONCEJAL" | "CONSEJERO_ESCOLAR"> = {
  intendente: "INTENDENTE",
  concejales: "CONCEJAL",
  consejeros_escolares: "CONSEJERO_ESCOLAR",
};

export interface ElectoCargo {
  nombre: string;
  partido: string;
  cargo: CargoLocal;
}

interface ElectoRow extends mysql.RowDataPacket {
  nombre: string;
  partido: string;
}

export async function electosPorCargo(anio: number, cargo: CargoLocal): Promise<ElectoCargo[]> {
  const [rows] = await db.query<ElectoRow[]>(
    `SELECT e2.nombre_completo AS nombre, COALESCE(a.nombre, 'Sin agrupación') AS partido
     FROM electos e2
     LEFT JOIN agrupaciones a ON a.id = e2.agrupacion_id
     JOIN elecciones e ON e.id = e2.eleccion_id
     WHERE e.anio = ? AND e2.cargo = ? AND e2.condicion = 'TITULAR'
     ORDER BY e2.orden ASC, e2.nombre_completo ASC`,
    [anio, CARGO_ENUM[cargo]]
  );
  return rows.map((row) => ({
    nombre: row.nombre,
    partido: row.partido,
    cargo,
  }));
}
