import { useState } from 'react';

/**
 * Texto que late cuando cambia con la pantalla abierta (el marcador al entrar
 * un gol en directo). Al montarse no anima; cada valor nuevo remonta el nodo
 * para que la animación vuelva a empezar.
 */
export function Cifra({ valor }: { valor: string }) {
  const [inicial] = useState(valor);
  return (
    <span
      key={valor}
      className={valor === inicial ? 'cifra' : 'cifra cifra--cambia'}
    >
      {valor}
    </span>
  );
}
