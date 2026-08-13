const DIACRITICOS = /[\u0300-\u036f]/g;

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarPersona(texto: string): string {
  const separado = texto.includes(",")
    ? texto.split(",").reverse().join(" ")
    : texto;
  return normalizar(separado);
}

export type CoincidenciaAgrupacion = {
  nombre: string;
  anio: number;
  votos: number | null;
};

function tokens(texto: string): string[] {
  return normalizar(texto).split(" ").filter(Boolean);
}

function sinParentesis(texto: string): string {
  return texto.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

export type ResultadoBusqueda =
  | { estado: "coincidencia"; candidato: string }
  | { estado: "ambigua"; candidatos: string[] }
  | { estado: "no_encontrada" };

export function buscarAgrupacion(
  consulta: string,
  candidatas: CoincidenciaAgrupacion[]
): ResultadoBusqueda {
  const target = normalizar(consulta);
  if (!target) return { estado: "no_encontrada" };

  const nombres = new Map<string, number>();
  for (const c of candidatas) {
    nombres.set(c.nombre, (nombres.get(c.nombre) ?? 0) + 1);
  }
  const unicas = [...nombres.keys()];

  const exactas = unicas.filter((n) => normalizar(n) === target);
  if (exactas.length === 1) return { estado: "coincidencia", candidato: exactas[0] };

  const sinParen = unicas.filter((n) => normalizar(sinParentesis(n)) === target);
  if (sinParen.length === 1) return { estado: "coincidencia", candidato: sinParen[0] };

  const porContencion = unicas.filter(
    (n) =>
      normalizar(n).includes(target) ||
      target.includes(normalizar(sinParentesis(n)))
  );
  if (porContencion.length === 1) {
    return { estado: "coincidencia", candidato: porContencion[0] };
  }

  if (exactas.length > 1 || sinParen.length > 1 || porContencion.length > 1) {
    return { estado: "ambigua", candidatos: unicas };
  }
  return { estado: "no_encontrada" };
}

export type CoincidenciaPersona = {
  nombre_completo: string;
};

export type ResultadoBusquedaPersona =
  | { estado: "coincidencia"; candidato: string }
  | { estado: "ambigua"; candidatos: string[] }
  | { estado: "no_encontrada" };

export function coincidePersona(consulta: string, nombreCompleto: string): boolean {
  const queryTokens = tokens(consulta);
  if (queryTokens.length === 0) return false;
  const nombreTokens = tokens(nombreCompleto);
  return queryTokens.every((t) => {
    if (nombreTokens.includes(t)) return true;
    return nombreTokens.some((n) => n.startsWith(t) && t.length >= 3);
  });
}

export function buscarPersona(
  consulta: string,
  candidatas: CoincidenciaPersona[]
): ResultadoBusquedaPersona {
  if (tokens(consulta).length === 0) return { estado: "no_encontrada" };

  const coinciden = candidatas.filter((c) => coincidePersona(consulta, c.nombre_completo));

  const sinDuplicados = [...new Map(coinciden.map((c) => [c.nombre_completo, c])).values()];
  if (sinDuplicados.length === 1) {
    return { estado: "coincidencia", candidato: sinDuplicados[0].nombre_completo };
  }
  if (sinDuplicados.length > 1) {
    const nombres = sinDuplicados.map((c) => c.nombre_completo);
    const iniciales = new Set(
      nombres.map((n) => {
        const partes = n.split(",");
        return partes.length > 1 ? partes[1].trim().split(/\s+/)[0] ?? "" : "";
      })
    );
    if (iniciales.size <= 1) {
      return { estado: "coincidencia", candidato: nombres[0] };
    }
    return { estado: "ambigua", candidatos: nombres };
  }
  return { estado: "no_encontrada" };
}
