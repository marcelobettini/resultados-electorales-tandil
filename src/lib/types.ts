export type OfficeCode = "intendente" | "concejales" | "consejeros_escolares";

export interface Eleccion {
  id: number;
  anio: number;
  fecha: string | null;
  elige_intendente: boolean;
  cantidad_concejales: number | null;
  cantidad_consejeros: number | null;
  electores_habilitados: number | null;
  total_mesas: number | null;
  votos_positivos: number | null;
  votos_blanco: number | null;
  votos_nulos: number | null;
  notas: string | null;
  url_pdf: string | null;
}

export interface Office {
  code: OfficeCode;
  name: string;
  order: number;
}

export interface AgrupacionResult {
  id: number;
  numero_lista: string | null;
  nombre: string;
  votos: number | null;
  porcentaje: number | null;
  concejales_obtenidos: number;
  consejeros_obtenidos: number;
  obtuvo_intendencia: boolean;
  orden_visualizacion: number | null;
}

export type CondicionElecto = "TITULAR" | "SUPLENTE";

export interface Electo {
  nombre_completo: string;
  condicion: CondicionElecto;
  orden: number | null;
  agrupacion_nombre: string | null;
}

export type CategoriaId =
  | "ganador_eleccion"
  | "ganador_intendencia"
  | "diferencia_primero_segundo"
  | "ranking_top_n"
  | "totales_eleccion"
  | "bancas_por_partido"
  | "personas_electas_cargo"
  | "serie_total_votos"
  | "participacion"
  | "votos_agrupacion"
  | "participacion_agrupacion"
  | "serie_agrupacion"
  | "historial_persona";

export type CargoLocal = "intendente" | "concejales" | "consejeros_escolares";

export type MotivoRechazo =
  | "no_entendida"
  | "ambito_no_local"
  | "paso"
  | "cargo_no_local"
  | "comparacion_partido_entre_anios";

export type TipoRespuesta =
  | "respuesta"
  | "fuera_de_alcance"
  | "sin_datos"
  | "no_entendida"
  | "categoria_no_disponible"
  | "error_sistema";

export interface IntentoConsulta {
  valido: boolean;
  categoria: CategoriaId | null;
  cargo: CargoLocal | null;
  anio: number | null;
  // null + es_ultima_eleccion=true → se resuelve a MAX(anio) en la capa de consultas
  es_ultima_eleccion: boolean;
  limite: number | null;
  agrupacion?: string | null;
  persona?: string | null;
  motivo_rechazo: MotivoRechazo | null;
}

export interface Interpretacion {
  // anio ya resuelto en la capa de consultas, nunca null en la respuesta
  anio: number;
  categoria: CategoriaId;
  cargo: CargoLocal | null;
  agrupacion?: string | null;
  persona?: string | null;
}

export interface Respuesta {
  tipo: TipoRespuesta;
  texto: string;
  interpretacion: Interpretacion | null;
  advertencia: string | null;
  desde_cache: boolean;
}
