import mysql from "mysql2/promise";
import { db } from "@/lib/db";
import type { CargoLocal } from "@/lib/types";
import { buscarPersona, coincidePersona, normalizar } from "./matching";

export interface HistorialPersonaRow {
  anio: number;
  cargo: string;
  condicion: string;
  nombre_completo: string;
}

interface ElectoRow extends mysql.RowDataPacket {
  anio: number;
  cargo: string;
  condicion: string;
  nombre_completo: string;
}

export type EstadoHistorial = "encontrada" | "no_encontrada" | "ambigua";

export interface CandidatoPersona {
  nombre_completo: string;
  cargos: Array<{ cargo: string; anios: number[] }>;
}

export interface ResultadoHistorialPersona {
  estado: EstadoHistorial;
  nombre: string | null;
  registros: HistorialPersonaRow[];
  candidatos?: CandidatoPersona[];
}

function agruparCandidatos(rows: ElectoRow[]): CandidatoPersona[] {
  const porNombre = new Map<string, Map<string, Set<number>>>();
  for (const fila of rows) {
    const porCargo = porNombre.get(fila.nombre_completo) ?? new Map<string, Set<number>>();
    const anios = porCargo.get(fila.cargo) ?? new Set<number>();
    anios.add(fila.anio);
    porCargo.set(fila.cargo, anios);
    porNombre.set(fila.nombre_completo, porCargo);
  }
  return [...porNombre.entries()].map(([nombre, porCargo]) => ({
    nombre_completo: nombre,
    cargos: [...porCargo.entries()].map(([cargo, anios]) => ({
      cargo,
      anios: [...anios].sort((a, b) => a - b),
    })),
  }));
}

const CARGO_ELECTOS: Record<CargoLocal, string> = {
  intendente: "INTENDENTE",
  concejales: "CONCEJAL",
  consejeros_escolares: "CONSEJERO_ESCOLAR",
};

export async function historialPersona(
  consulta: string,
  cargo?: CargoLocal | null
): Promise<ResultadoHistorialPersona> {
  const tokens = normalizar(consulta).split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return { estado: "no_encontrada", nombre: null, registros: [] };
  }
  const apellido = tokens[tokens.length - 1];
  const like = `%${apellido}%`;

  const condiciones = ["LOWER(el.nombre_completo) LIKE ?"];
  const params: Array<string> = [like];
  if (cargo) {
    condiciones.push("el.cargo = ?");
    params.push(CARGO_ELECTOS[cargo]);
  }

  const [rows] = await db.query<ElectoRow[]>(
    `SELECT e.anio, el.cargo, el.condicion, el.nombre_completo
     FROM electos el
     JOIN elecciones e ON e.id = el.eleccion_id
     WHERE ${condiciones.join(" AND ")}
     ORDER BY e.anio ASC, el.cargo ASC`,
    params
  );

  const busqueda = buscarPersona(
    consulta,
    rows.map((r) => ({ nombre_completo: r.nombre_completo }))
  );
  if (busqueda.estado === "no_encontrada") {
    return { estado: "no_encontrada", nombre: null, registros: [] };
  }
  if (busqueda.estado === "ambigua") {
    const nombres = new Set(busqueda.candidatos);
    const candidatos = agruparCandidatos(rows.filter((r) => nombres.has(r.nombre_completo)));
    return { estado: "ambigua", nombre: null, registros: [], candidatos };
  }

  const registros = rows
    .filter((r) => coincidePersona(consulta, r.nombre_completo))
    .map((r) => ({
      anio: r.anio,
      cargo: r.cargo,
      condicion: r.condicion,
      nombre_completo: r.nombre_completo,
    }));
  return { estado: "encontrada", nombre: busqueda.candidato, registros };
}
