import Link from "next/link";
import type { Eleccion } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface Props {
  elecciones: Eleccion[];
}

export function ElectionList({ elecciones }: Props) {
  return (
    <nav aria-label="Histórico de elecciones" className="election-list-wrap">
      <ul className="election-list">
        {elecciones.map((eleccion) => (
          <li key={eleccion.anio}>
            <Link href={`/elecciones/${eleccion.anio}`} className="election-list__link">
              <span className="election-list__year">Elecciones {eleccion.anio}</span>
              {eleccion.fecha && (
                <span className="election-list__date">{formatDate(eleccion.fecha)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
