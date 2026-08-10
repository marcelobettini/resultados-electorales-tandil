import { resolverConsulta } from "@/lib/consultas/catalog";
import { cargoElegidoEnAnio, resolveYear } from "@/lib/consultas/years";
import { getCategoria } from "@/lib/interpretacion/taxonomy";
import {
  armarRespuesta,
  fueraDeAlcanceTemplate,
  noEntendidaTemplate,
} from "@/lib/respuestas/templates";
import type {
  CategoriaId,
  IntentoConsulta,
  Interpretacion,
  MotivoRechazo,
  Respuesta,
  TipoRespuesta,
} from "@/lib/types";

const MOTIVO_A_TIPO: Record<MotivoRechazo, TipoRespuesta> = {
  no_entendida: "no_entendida",
  ambito_no_local: "fuera_de_alcance",
  paso: "fuera_de_alcance",
  cargo_no_local: "fuera_de_alcance",
  comparacion_partido_entre_anios: "fuera_de_alcance",
};

const CATEGORIAS_CON_CARGO: ReadonlySet<CategoriaId> = new Set([
  "ganador_intendencia",
  "bancas_por_partido",
  "personas_electas_cargo",
]);

export async function renderRespuesta(intento: IntentoConsulta): Promise<Respuesta> {
  if (!intento.valido) {
    const motivo = intento.motivo_rechazo ?? "no_entendida";
    const tipo = MOTIVO_A_TIPO[motivo];
    const texto =
      tipo === "no_entendida" ? noEntendidaTemplate() : fueraDeAlcanceTemplate(motivo);
    return { tipo, texto, interpretacion: null, advertencia: null, desde_cache: false };
  }

  if (intento.categoria === null) {
    return armarRespuesta("no_entendida", null, null);
  }

  if (!getCategoria(intento.categoria).implemented) {
    return armarRespuesta("categoria_no_disponible", null, null);
  }

  const anio = await resolveYear(intento.anio, intento.es_ultima_eleccion);
  if (anio === null) {
    return armarRespuesta("sin_datos", null, null);
  }

  if (
    intento.cargo &&
    CATEGORIAS_CON_CARGO.has(intento.categoria) &&
    !(await cargoElegidoEnAnio(intento.cargo, anio))
  ) {
    return armarRespuesta("sin_datos", null, null);
  }

  const interpretacion: Interpretacion = {
    anio,
    categoria: intento.categoria,
    cargo: intento.cargo,
  };

  const { datos, advertencia } = await resolverConsulta(interpretacion, intento.limite);
  const respuesta = armarRespuesta("respuesta", datos, interpretacion);

  if (advertencia && !respuesta.advertencia) {
    return {
      ...respuesta,
      texto: `${respuesta.texto}\n\nAdvertencia: ${advertencia}`,
      advertencia,
    };
  }
  return respuesta;
}
