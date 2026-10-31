import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export const PIEZAS = 26;
const COLORES = 4;

interface Pieza {
  x: number;
  y: number;
  caida: number;
  giro: number;
  retraso: number;
  color: number;
  redonda: boolean;
}

/** Abanico hacia arriba, con cada pieza a su distancia, giro y color. */
function repartir(azar: () => number): Pieza[] {
  return Array.from({ length: PIEZAS }, (_, i) => {
    const angulo = (-160 + azar() * 140) * (Math.PI / 180);
    const distancia = 50 + azar() * 70;
    return {
      x: Math.cos(angulo) * distancia,
      y: Math.sin(angulo) * distancia,
      caida: 90 + azar() * 80,
      giro: (azar() - 0.5) * 720,
      retraso: azar() * 120,
      color: (i % COLORES) + 1,
      redonda: i % 3 === 0,
    };
  });
}

/**
 * Estallido corto de confeti que sale del centro del contenedor (que debe ir
 * posicionado) y se quita solo al acabar. Solo mueve `transform` y `opacity`.
 * Quien lo pinta decide si toca; con movimiento reducido el CSS lo oculta.
 */
export function Confeti({ azar = Math.random }: { azar?: () => number }) {
  const [piezas] = useState(() => repartir(azar));
  const acabadas = useRef(0);
  const [fuera, setFuera] = useState(false);
  if (fuera) return null;
  return (
    <div
      className="confeti"
      aria-hidden
      data-testid="confeti"
      onAnimationEnd={() => {
        acabadas.current += 1;
        if (acabadas.current === PIEZAS) setFuera(true);
      }}
    >
      {piezas.map((p, i) => (
        <span
          key={i}
          className={
            p.redonda
              ? 'confeti__pieza confeti__pieza--redonda'
              : 'confeti__pieza'
          }
          style={
            {
              '--x': `${p.x}px`,
              '--y': `${p.y}px`,
              '--caida': `${p.caida}px`,
              '--giro': `${p.giro}deg`,
              '--retraso': `${p.retraso}ms`,
              background: `var(--app-confeti-${p.color})`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
