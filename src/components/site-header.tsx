import Link from "next/link";
import { MdOutlineHowToVote } from "react-icons/md";

export function SiteHeader() {
  return (
    <header className="site-head">
      <div className="site-head__inner">
        <Link href="/" className="site-head__brand">
          <MdOutlineHowToVote className="site-head__urn" aria-hidden="true" />
          <span className="site-head__text">
            <span className="site-head__name">Municipalidad de Tandil</span>
            <span className="site-head__tag">Resultados electorales</span>
          </span>
        </Link>
        <p className="site-head__status">
          <span aria-hidden="true" className="site-head__dot" />
          Escrutinio definitivo
        </p>
      </div>
    </header>
  );
}
