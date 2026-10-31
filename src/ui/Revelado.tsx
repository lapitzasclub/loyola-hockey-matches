import { useState } from 'react';
import type { ReactNode } from 'react';

import { movimientoPermitido } from './movimiento';

/**
 * Si la consulta ha estado pendiente en algún momento de la vida del
 * componente: lo que se pinte después sustituye a un skeleton.
 */
export function useEspera(pendiente: boolean) {
  const [espera, setEspera] = useState(pendiente);
  if (pendiente && !espera) setEspera(true);
  return espera;
}

interface Props {
  /** Si antes hubo skeleton (ver `useEspera`); con datos de caché no anima. */
  espera: boolean;
  /** El skeleton al que sustituye: se funde encima mientras entra el contenido. */
  saliente?: ReactNode;
  children: ReactNode;
}

/**
 * Paso de skeleton a contenido: el contenido entra con un fundido corto y el
 * skeleton se desvanece encima, así uno se transforma en el otro en vez de
 * saltar. Con movimiento reducido se pinta sin transición.
 */
export function Revelado({ espera, saliente, children }: Props) {
  const [animar] = useState(() => espera && movimientoPermitido());
  const [fuera, setFuera] = useState(false);
  return (
    <div className={animar ? 'revelado' : undefined}>
      {children}
      {animar && saliente && !fuera && (
        <div
          className="revelado__saliente"
          aria-hidden
          inert
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setFuera(true);
          }}
        >
          {saliente}
        </div>
      )}
    </div>
  );
}
