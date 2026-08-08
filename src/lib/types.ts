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
