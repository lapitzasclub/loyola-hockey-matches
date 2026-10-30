import type { CSSProperties } from 'react';

interface Props {
  ancho?: number | string;
  alto?: number | string;
  /** Círculo (escudos) en vez de barra. */
  redondo?: boolean;
  style?: CSSProperties;
}

/** Bloque de carga; solo late la opacidad (ver styles/componentes.css). */
export function Skeleton({ ancho = '100%', alto = 12, redondo, style }: Props) {
  return (
    <span
      className={`skeleton${redondo ? ' skeleton--redondo' : ''}`}
      style={{ width: ancho, height: alto, ...style }}
      aria-hidden
    />
  );
}
