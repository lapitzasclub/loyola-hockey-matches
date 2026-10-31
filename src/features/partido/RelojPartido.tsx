import { useEffect, useState } from 'react';

import type { PartidoDetalle } from '../../domain';
import { formatoCrono } from '../../ui/formato';

type Reloj = NonNullable<PartidoDetalle['reloj']>;

function Cuenta({ minuto, segundo, enMarcha }: Reloj) {
  const [desde] = useState(() => Date.now());
  const [ahora, setAhora] = useState(desde);
  useEffect(() => {
    if (!enMarcha) return;
    const tic = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(tic);
  }, [enMarcha]);
  const restante = Math.max(
    0,
    minuto * 60 + segundo - Math.floor((ahora - desde) / 1000),
  );
  return (
    <span className="partido-cabecera__reloj" data-testid="reloj">
      {formatoCrono(Math.floor(restante / 60), restante % 60)}
    </span>
  );
}

/**
 * Tiempo que le queda al periodo (el reloj del hockey va hacia atrás). El
 * directo lo manda cada ~3 s; entre medias se descuenta aquí, y cada valor
 * nuevo remonta la cuenta para corregir la deriva. Parado a 0:00 es el
 * final del periodo: no dice nada que no diga ya el periodo.
 */
export function RelojPartido({ reloj }: { reloj: Reloj }) {
  const { minuto, segundo, enMarcha } = reloj;
  if (!enMarcha && minuto === 0 && segundo === 0) return null;
  return <Cuenta key={`${minuto}:${segundo}:${enMarcha}`} {...reloj} />;
}
