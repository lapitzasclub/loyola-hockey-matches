interface Props {
  nombre: string;
  fotoUrl: string | null;
  /** Lado en px; por defecto el de las filas de lista. */
  tamano?: number;
}

/** Foto de jugador o técnico; sin ella, un círculo con las iniciales. */
export function FotoPersona({ nombre, fotoUrl, tamano }: Props) {
  const estilo = tamano ? { width: tamano, height: tamano } : undefined;
  return fotoUrl ? (
    <img
      className="persona__foto"
      style={estilo}
      src={fotoUrl}
      alt=""
      loading="lazy"
    />
  ) : (
    <span
      className="persona__foto persona__foto--iniciales"
      style={estilo}
      aria-hidden
    >
      {nombre.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}
