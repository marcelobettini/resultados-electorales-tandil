import { unstable_cache } from "next/cache";
import mysql from "mysql2/promise";
import { db } from "@/lib/db";
import { electionTag } from "@/lib/queries/elections";
import type { AgrupacionResult, Electo, OfficeCode } from "@/lib/types";

const CARGO_ENUM: Record<OfficeCode, string> = {
  intendente: "INTENDENTE",
  concejales: "CONCEJAL",
  consejeros_escolares: "CONSEJERO_ESCOLAR",
};

interface AgrupacionRow extends mysql.RowDataPacket {
  id: number;
  numero_lista: string | null;
  nombre: string;
  votos: number | null;
  porcentaje: string | null;
  concejales_obtenidos: number;
  consejeros_obtenidos: number;
  obtuvo_intendencia: number;
  orden_visualizacion: number | null;
}

interface ElectoRow extends mysql.RowDataPacket {
  nombre_completo: string;
  condicion: "TITULAR" | "SUPLENTE";
  orden: number | null;
  agrupacion_nombre: string | null;
}

async function fetchAgrupaciones(electionId: number): Promise<AgrupacionResult[]> {
  const [rows] = await db.query<AgrupacionRow[]>(
    `SELECT id, numero_lista, nombre, votos, porcentaje, concejales_obtenidos,
            consejeros_obtenidos, obtuvo_intendencia, orden_visualizacion
     FROM agrupaciones
     WHERE eleccion_id = ?
     ORDER BY COALESCE(orden_visualizacion, 2147483647) ASC, votos DESC`,
    [electionId]
  );
  return rows.map((row) => ({
    id: row.id,
    numero_lista: row.numero_lista,
    nombre: row.nombre,
    votos: row.votos,
    porcentaje: row.porcentaje === null ? null : Number(row.porcentaje),
    concejales_obtenidos: row.concejales_obtenidos,
    consejeros_obtenidos: row.consejeros_obtenidos,
    obtuvo_intendencia: row.obtuvo_intendencia === 1,
    orden_visualizacion: row.orden_visualizacion,
  }));
}

export function getAgrupaciones(electionId: number, year: number): Promise<AgrupacionResult[]> {
  return unstable_cache(fetchAgrupaciones, [`agrupaciones-${electionId}`], {
    revalidate: 3600,
    tags: [electionTag(year)],
  })(electionId);
}

async function fetchElectos(electionId: number, officeCode: OfficeCode): Promise<Electo[]> {
  const [rows] = await db.query<ElectoRow[]>(
    `SELECT e.nombre_completo, e.condicion, e.orden, a.nombre AS agrupacion_nombre
     FROM electos e
     LEFT JOIN agrupaciones a ON a.id = e.agrupacion_id
     WHERE e.eleccion_id = ? AND e.cargo = ?
     ORDER BY e.condicion ASC, COALESCE(e.orden, 255) ASC, e.nombre_completo ASC`,
    [electionId, CARGO_ENUM[officeCode]]
  );
  return rows.map((row) => ({
    nombre_completo: row.nombre_completo,
    condicion: row.condicion,
    orden: row.orden,
    agrupacion_nombre: row.agrupacion_nombre,
  }));
}

export function getElectos(
  electionId: number,
  officeCode: OfficeCode,
  year: number
): Promise<Electo[]> {
  return unstable_cache(fetchElectos, [`electos-${electionId}-${officeCode}`], {
    revalidate: 3600,
    tags: [electionTag(year)],
  })(electionId, officeCode);
}
