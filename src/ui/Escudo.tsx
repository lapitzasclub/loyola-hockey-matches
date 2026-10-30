import { useState } from 'react';

interface Props {
  logoUrl: string | null;
  nombre: string;
  abreviatura?: string;
  /** Lado en px. */
  tamano?: number;
}

/** Escudo del club; sin imagen o si falla, un círculo con las iniciales. */
export function Escudo({ logoUrl, nombre, abreviatura, tamano = 44 }: Props) {
  const [fallo, setFallo] = useState(false);
  const estilo = { width: tamano, height: tamano };

  if (logoUrl && !fallo) {
    return (
      <img
        className="escudo"
        style={estilo}
        src={logoUrl}
        alt=""
        loading="lazy"
        onError={() => setFallo(true)}
      />
    );
  }
  const iniciales = (abreviatura || nombre).trim().slice(0, 3).toUpperCase();
  return (
    <span className="escudo escudo--iniciales" style={estilo} aria-hidden>
      {iniciales}
    </span>
  );
}
