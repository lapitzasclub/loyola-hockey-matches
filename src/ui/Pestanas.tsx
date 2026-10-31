import { IonSegment, IonSegmentButton } from '@ionic/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { movimientoPermitido } from './movimiento';
import { pastillaEn } from './pastilla';
import type { Tramo } from './pastilla';

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

/**
 * Pestañas deslizables: un segmento de Ionic arriba y los paneles en una fila
 * con `scroll-snap`, así el gesto lo resuelve el navegador. Todos los paneles
 * están montados; los inactivos se recortan a la altura del activo para que la
 * página no mida lo que el más alto. La pastilla del segmento es propia y
 * sigue al desplazamiento de los paneles también a mitad de gesto (la de
 * Ionic solo salta al cambiar de valor). Cada `data-testid` sale de `testId`:
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
  const segmento = useRef<HTMLIonSegmentElement>(null);
  const pastilla = useRef<HTMLDivElement>(null);
  const tramos = useRef<Tramo[]>([]);
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

  const colocarPastilla = useCallback(() => {
    const el = fila.current;
    const base = tramos.current[0];
    if (!el || !pastilla.current || !base || el.clientWidth === 0) return;
    const hueco = pastillaEn(tramos.current, el.scrollLeft / el.clientWidth);
    if (!hueco) return;
    // Con botones de igual ancho la escala es 1 y solo se traslada.
    pastilla.current.style.transform = `translateX(${hueco.x}px) scaleX(${hueco.ancho / base.ancho})`;
  }, []);

  useLayoutEffect(() => {
    const seg = segmento.current;
    if (!seg || typeof ResizeObserver === 'undefined') return;
    const botones = [...seg.querySelectorAll('ion-segment-button')];
    const medir = () => {
      const caja = seg.getBoundingClientRect();
      tramos.current = botones.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.left - caja.left + seg.scrollLeft, ancho: r.width };
      });
      const base = tramos.current[0];
      if (pastilla.current && base) {
        pastilla.current.style.width = `${base.ancho}px`;
      }
      colocarPastilla();
    };
    medir();
    // Se vuelve a medir cuando Ionic hidrata los botones y al cambiar de idioma.
    const observador = new ResizeObserver(medir);
    [seg, ...botones].forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [pestanas.length, colocarPastilla]);

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
      behavior: movimientoPermitido() ? 'smooth' : 'auto',
    });
  }, [indice]);

  const alDeslizar = useCallback(() => {
    const el = fila.current;
    if (!el || el.clientWidth === 0) return;
    colocarPastilla();
    const cerca = Math.round(el.scrollLeft / el.clientWidth);
    if (guiado.current) {
      if (cerca === indice) guiado.current = false;
      return;
    }
    const pestana = pestanas[cerca];
    if (pestana && pestana.id !== valor) alCambiar(pestana.id);
  }, [indice, pestanas, valor, alCambiar, colocarPastilla]);

  return (
    <div data-testid={testId}>
      <IonSegment
        ref={segmento}
        className="segmento segmento--deslizante"
        value={valor}
        onIonChange={(e) => {
          const id = pestanas.find((p) => p.id === e.detail.value)?.id;
          if (id && id !== valor) alCambiar(id);
        }}
      >
        <div ref={pastilla} className="segmento__pastilla" aria-hidden>
          <span />
        </div>
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
