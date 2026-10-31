import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type { Racha as RachaDominio } from '../domain';

const LETRAS = { victoria: 'V', empate: 'E', derrota: 'D' } as const;

interface Props {
  racha: RachaDominio;
  /** Más pequeña, para las filas de la tabla. */
  compacta?: boolean;
}

/** Últimos resultados como puntos V/E/D, del más antiguo al más reciente. */
export function Racha({ racha, compacta }: Props) {
  const { t } = useTranslation();
  if (racha.length === 0) return null;
  return (
    <span
      className={`racha${compacta ? ' racha--compacta' : ''}`}
      role="img"
      aria-label={racha.map((r) => t(`racha.${r}`)).join(', ')}
      data-testid="racha"
    >
      {racha.map((resultado, i) => (
        <span
          key={i}
          className={`racha__punto racha__punto--${resultado}`}
          // Entran uno tras otro, del más antiguo al más reciente.
          style={{ '--i': i } as CSSProperties}
          aria-hidden
        >
          {LETRAS[resultado]}
        </span>
      ))}
    </span>
  );
}
