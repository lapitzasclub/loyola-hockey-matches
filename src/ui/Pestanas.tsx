import { IonSegment, IonSegmentButton } from '@ionic/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export interface Pestana<Id extends string> {
  id: Id;
  etiqueta: string;
  contenido: ReactNode;
}

interface Props<Id extends string> {
  pestanas: readonly Pestana<Id>[];
  valor: Id;
  alCambiar: (id: Id) => void;
  testId: string;
}

const reducirMovimiento = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Pestañas deslizables: un segmento de Ionic arriba y los paneles en una fila
 * con `scroll-snap`, así el gesto lo resuelve el navegador. Todos los paneles
 * están montados; los inactivos se recortan a la altura del activo para que la
 * página no mida lo que el más alto. Cada `data-testid` sale de `testId`:
 * `{testId}`, `{testId}-{id}` (botón) y `{testId}-panel-{id}`.
 */
export function Pestanas<Id extends string>({
  pestanas,
  valor,
  alCambiar,
  testId,
}: Props<Id>) {
  const fila = useRef<HTMLDivElement>(null);
  const activo = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | null>(null);
  // Mientras el desplazamiento lo causa el segmento, no se lee como gesto.
  const guiado = useRef(false);
  const indice = Math.max(
    0,
    pestanas.findIndex((p) => p.id === valor),
  );

  useLayoutEffect(() => {
    const contenido = activo.current;
    if (!contenido || typeof ResizeObserver === 'undefined') return;
    const medir = () => setAlto(contenido.scrollHeight);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(contenido);
    return () => observador.disconnect();
  }, [valor]);

  useEffect(() => {
    const el = fila.current;
    if (!el || el.clientWidth === 0) return;
    const destino = indice * el.clientWidth;
    // Si ya está en su sitio no hay nada que mover, salvo que aún haya un
    // desplazamiento en curso hacia otro panel: hay que pisarlo.
    if (Math.abs(el.scrollLeft - destino) < 1 && !guiado.current) return;
    guiado.current = true;
    el.scrollTo({
      left: destino,
      behavior: reducirMovimiento() ? 'auto' : 'smooth',
    });
  }, [indice]);

  const alDeslizar = useCallback(() => {
    const el = fila.current;
    if (!el || el.clientWidth === 0) return;
    const cerca = Math.round(el.scrollLeft / el.clientWidth);
    if (guiado.current) {
      if (cerca === indice) guiado.current = false;
      return;
    }
    const pestana = pestanas[cerca];
    if (pestana && pestana.id !== valor) alCambiar(pestana.id);
  }, [indice, pestanas, valor, alCambiar]);

  return (
    <div data-testid={testId}>
      <IonSegment
        className="segmento"
        value={valor}
        onIonChange={(e) => {
          const id = pestanas.find((p) => p.id === e.detail.value)?.id;
          if (id && id !== valor) alCambiar(id);
        }}
      >
        {pestanas.map((p) => (
          <IonSegmentButton
            key={p.id}
            value={p.id}
            data-testid={`${testId}-${p.id}`}
          >
            {p.etiqueta}
          </IonSegmentButton>
        ))}
      </IonSegment>
      <div ref={fila} className="pestanas__fila" onScroll={alDeslizar}>
        {pestanas.map((p) => {
          const esActivo = p.id === valor;
          return (
            <div
              key={p.id}
              className="pestanas__panel"
              style={
                !esActivo && alto !== null ? { maxHeight: alto } : undefined
              }
              inert={!esActivo}
              aria-hidden={!esActivo}
              data-testid={`${testId}-panel-${p.id}`}
            >
              <div ref={esActivo ? activo : undefined}>{p.contenido}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
