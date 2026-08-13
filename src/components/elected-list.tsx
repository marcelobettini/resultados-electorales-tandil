import type { Electo } from "@/lib/types";
import { displayValue } from "@/lib/format";

interface Props {
  electos: Electo[];
}

export function ElectedList({ electos }: Props) {
  if (electos.length === 0) {
    return null;
  }

  const porFrente = new Map<string, Electo[]>();
  for (const electo of electos) {
    const frente = electo.agrupacion_nombre ?? "Sin agrupación";
    const lista = porFrente.get(frente);
    if (lista) {
      lista.push(electo);
    } else {
      porFrente.set(frente, [electo]);
    }
  }

  return (
    <div className="elected-list-wrap">
      {[...porFrente.entries()].map(([frente, personas]) => (
        <div key={frente} className="elected-group">
          <h5>{frente}</h5>
          <ol className="elected-list">
            {personas.map((persona, i) => (
              <li key={`${persona.nombre_completo}-${i}`} className="elected-list__item">
                <span className="elected-list__orden">{displayValue(persona.orden)}.</span>
                <span className="elected-list__nombre">{persona.nombre_completo}</span>
                {persona.condicion === "SUPLENTE" && (
                  <span className="elected-list__tag">Suplente</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
