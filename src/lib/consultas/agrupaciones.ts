import mysql from "mysql2/promise";
import { db } from "@/lib/db";
import { buscarAgrupacion, normalizar } from "./matching";

export interface AgrupacionAnio {
  nombre: string;
  anio: number;
  votos: number | null;
  porcentaje: number | null;
}

interface AgrupacionRow extends mysql.RowDataPacket {
  nombre: string;
  anio: number;
  votos: number | null;
  porcentaje: number | null;
}

export type EstadoAgrupacion = "encontrada" | "no_encontrada" | "ambigua";

export interface ResultadoAgrupacionAnio {
  estado: EstadoAgrupacion;
  nombre: string | null;
  votos: number | null;
  porcentaje: number | null;
}

async function agrupacionesDelAnio(anio: number): Promise<AgrupacionAnio[]> {
  const [rows] = await db.query<AgrupacionRow[]>(
    `SELECT a.nombre, e.anio, a.votos, a.porcentaje
     FROM agrupaciones a
     JOIN elecciones e ON e.id = a.eleccion_id
     WHERE e.anio = ?`,
    [anio]
  );
  return rows;
}

export async function votosAgrupacion(
  anio: number,
  consulta: string
): Promise<ResultadoAgrupacionAnio> {
  const candidatas = await agrupacionesDelAnio(anio);
  const busqueda = buscarAgrupacion(consulta, candidatas);
  if (busqueda.estado === "no_encontrada") {
    return { estado: "no_encontrada", nombre: null, votos: null, porcentaje: null };
  }
  if (busqueda.estado === "ambigua") {
    return { estado: "ambigua", nombre: null, votos: null, porcentaje: null };
  }
  const fila = candidatas.find((c) => c.nombre === busqueda.candidato) ?? null;
  return {
    estado: "encontrada",
    nombre: fila?.nombre ?? null,
    votos: fila?.votos ?? null,
    porcentaje: fila?.porcentaje ?? null,
  };
}

export async function participoAgrupacion(
  anio: number,
  consulta: string
): Promise<ResultadoAgrupacionAnio> {
  return votosAgrupacion(anio, consulta);
}

export interface SerieAgrupacion {
  registros: Array<{ anio: number; nombre: string; votos: number | null }>;
  denominacionesDistintas: number;
}

export async function serieAgrupacion(consulta: string): Promise<SerieAgrupacion | null> {
  const target = normalizar(consulta);
  if (!target) return null;

  const [rows] = await db.query<AgrupacionRow[]>(
    `SELECT a.nombre, e.anio, a.votos, a.porcentaje
     FROM agrupaciones a
     JOIN elecciones e ON e.id = a.eleccion_id
     ORDER BY e.anio ASC`
  );

  const vistos = new Map<number, Set<string>>();
  const registros: Array<{ anio: number; nombre: string; votos: number | null }> = [];
  let coincidencias = 0;

  for (const fila of rows) {
    if (!normalizar(fila.nombre).includes(target)) continue;
    coincidencias++;
    const porAnio = vistos.get(fila.anio) ?? new Set<string>();
    if (!porAnio.has(fila.nombre)) {
      porAnio.add(fila.nombre);
      vistos.set(fila.anio, porAnio);
      registros.push({ anio: fila.anio, nombre: fila.nombre, votos: fila.votos });
    }
  }

  if (coincidencias === 0) return null;
  return {
    registros,
    denominacionesDistintas: new Set(registros.map((r) => r.nombre)).size,
  };
}
