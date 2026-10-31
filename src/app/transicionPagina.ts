import {
  createAnimation,
  iosTransitionAnimation,
  mdTransitionAnimation,
} from '@ionic/react';
import type { Animation, TransitionOptions } from '@ionic/react';

import { movimientoPermitido } from '../ui/movimiento';
import { vuelaComoCaja } from '../ui/transiciones';
import {
  ajusteCaja,
  ajusteTexto,
  dentro,
  emparejar,
  interseccion,
} from './vuelo';
import type { Caja, Candidato } from './vuelo';

/** Con movimiento reducido, un fundido corto en vez del deslizamiento. */
const FUNDIDO_MS = 200;

/**
 * Lo que un texto hereda de su contexto (`.tarjeta__lado--propio …`) y que el
 * clon, colgado de `body`, perdería con solo su clase.
 */
const ESTILOS_TEXTO = [
  'color',
  'display',
  'font-family',
  'font-size',
  'font-style',
  'font-variant-numeric',
  'font-weight',
  'letter-spacing',
  'line-height',
  'overflow',
  'overflow-wrap',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-overflow',
  'text-transform',
  'white-space',
  '-webkit-box-orient',
  '-webkit-line-clamp',
];

interface Pieza extends Candidato {
  el: HTMLElement;
  caja: Caja;
}

let ultimoEnlace: Element | null = null;
/** Enlace desde el que se abrió cada página: al volver, se vuela a ese. */
const enlaceDeOrigen = new WeakMap<Element, Element>();
/** Limpiezas de vuelos en curso, por si una navegación pisa a otra. */
const pendientes = new Set<() => void>();

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      ultimoEnlace =
        e.target instanceof Element
          ? e.target.closest('ion-router-link, a')
          : null;
    },
    { capture: true },
  );
}

const aCaja = ({ left, top, width, height }: DOMRect): Caja => ({
  left,
  top,
  width,
  height,
});

/** Los elementos con nombre de transición que se ven enteros en la página. */
function piezas(pagina: HTMLElement | undefined, enlace: Element | null) {
  const vista = { left: 0, top: 0, width: innerWidth, height: innerHeight };
  const lista: Pieza[] = [];
  pagina?.querySelectorAll<HTMLElement>('[data-transicion]').forEach((el) => {
    const nombre = el.dataset.transicion;
    const caja = aCaja(el.getBoundingClientRect());
    const contenido = el.closest('ion-content');
    const marco = contenido ? aCaja(contenido.getBoundingClientRect()) : vista;
    if (nombre && dentro(caja, marco)) {
      lista.push({ el, nombre, caja, pulsado: !!enlace?.contains(el) });
    }
  });
  return lista;
}

/** Caja de las letras (no del elemento), recortada a lo que se ve. */
function cajaTexto({ el, caja }: Pieza): Caja {
  const rango = document.createRange();
  rango.selectNodeContents(el);
  const letras = rango.getBoundingClientRect?.();
  return (letras && interseccion(aCaja(letras), caja)) ?? caja;
}

const tamanoLetra = (el: HTMLElement) =>
  parseFloat(getComputedStyle(el).fontSize) || 16;

const cargada = (el: HTMLElement) =>
  !(el instanceof HTMLImageElement) || (el.complete && el.naturalWidth > 0);

function clonar({ el, caja }: Pieza, texto: boolean): HTMLElement {
  const clon = el.cloneNode(true) as HTMLElement;
  for (const n of [clon, ...clon.querySelectorAll('*')]) {
    n.removeAttribute('id');
    n.removeAttribute('data-testid');
    n.removeAttribute('data-transicion');
  }
  if (texto) {
    const estilo = getComputedStyle(el);
    for (const p of ESTILOS_TEXTO) {
      clon.style.setProperty(p, estilo.getPropertyValue(p));
    }
  }
  Object.assign(clon.style, {
    position: 'fixed',
    left: `${caja.left}px`,
    top: `${caja.top}px`,
    width: `${caja.width}px`,
    height: `${caja.height}px`,
    margin: '0',
    boxSizing: 'border-box',
    transformOrigin: '0 0',
    pointerEvents: 'none',
    visibility: 'visible',
    zIndex: '10000',
    willChange: 'transform, opacity',
  });
  clon.setAttribute('aria-hidden', 'true');
  clon.dataset.vuelo = '';
  return clon;
}

/**
 * Vuelo de un elemento de la página que sale al de la que entra, como hijo de
 * la animación de página: hereda su duración y su curva, y el gesto de volver
 * lo arrastra con el dedo.
 */
function vuelo(de: Pieza, a: Pieza) {
  if (vuelaComoCaja(de.nombre)) {
    // Un solo clon, el escudo mayor si ya cargó: reducir no pixela.
    const [mayor, menor] = a.caja.width >= de.caja.width ? [a, de] : [de, a];
    const base = cargada(mayor.el) || !cargada(menor.el) ? mayor : menor;
    const clon = clonar(base, false);
    const animacion = createAnimation()
      .addElement(clon)
      .fromTo(
        'transform',
        ajusteCaja(base.caja, de.caja),
        ajusteCaja(base.caja, a.caja),
      );
    return { animacion, clones: [clon] };
  }

  // Dos clones que se cruzan: el texto de origen se va, el de destino llega.
  const origen = { caja: de.caja, texto: cajaTexto(de) };
  const destino = { caja: a.caja, texto: cajaTexto(a) };
  const escala = tamanoLetra(a.el) / tamanoLetra(de.el);
  const quieto = 'translate(0px, 0px) scale(1)';
  const sale = clonar(de, true);
  const llega = clonar(a, true);
  const animacion = createAnimation().addAnimation([
    createAnimation()
      .addElement(sale)
      .fromTo('transform', quieto, ajusteTexto(origen, destino, escala))
      .fromTo('opacity', '1', '0'),
    createAnimation()
      .addElement(llega)
      .fromTo('transform', ajusteTexto(destino, origen, 1 / escala), quieto)
      .fromTo('opacity', '0', '1'),
  ]);
  return { animacion, clones: [sale, llega] };
}

function vuelos({ enteringEl, leavingEl, direction }: TransitionOptions) {
  let enlace: Element | null = null;
  if (direction === 'back') {
    enlace = (leavingEl && enlaceDeOrigen.get(leavingEl)) ?? null;
  } else if (ultimoEnlace && leavingEl?.contains(ultimoEnlace)) {
    enlace = ultimoEnlace;
    enlaceDeOrigen.set(enteringEl, enlace);
  }
  ultimoEnlace = null;
  const pares = emparejar(
    piezas(leavingEl, enlace),
    piezas(enteringEl, enlace),
  );
  if (pares.length === 0) return null;

  const hechos = pares.map(([de, a]) => vuelo(de, a));
  const clones = hechos.flatMap((v) => v.clones);
  // Los originales se ocultan por nombre y no por nodo: si el destino se
  // vuelve a pintar a mitad del vuelo (llega el acta y la cabecera previa da
  // paso a la real), el nodo nuevo también queda oculto bajo su clon.
  const ocultos = document.createElement('style');
  ocultos.dataset.vueloOcultos = '';
  ocultos.textContent = `${pares
    .map(([de]) => `[data-transicion=${CSS.escape(de.nombre)}]`)
    .join(',')}{visibility:hidden!important}`;
  const limpiar = () => {
    pendientes.delete(limpiar);
    clones.forEach((c) => c.remove());
    ocultos.remove();
  };
  return createAnimation()
    .addAnimation(hechos.map((v) => v.animacion))
    .beforeAddWrite(() => {
      document.head.append(ocultos);
      document.body.append(...clones);
      pendientes.add(limpiar);
    })
    .afterAddWrite(limpiar);
}

function fundido({
  enteringEl,
  leavingEl,
  direction,
  duration,
}: TransitionOptions): Animation {
  const entra = createAnimation()
    .addElement(enteringEl)
    .beforeRemoveClass('ion-page-invisible');
  const raiz = createAnimation()
    .duration(duration ?? FUNDIDO_MS)
    .easing('linear')
    .fill('both')
    .addAnimation(entra);
  // Hacia atrás la página que entra está debajo: se destapa quitando la de arriba.
  if (direction !== 'back') entra.fromTo('opacity', '0', '1');
  else if (leavingEl) {
    raiz.addAnimation(
      createAnimation().addElement(leavingEl).fromTo('opacity', '1', '0'),
    );
  }
  return raiz;
}

/**
 * Animación de página para todo el router (`navAnimation`): la de Ionic del
 * modo (iOS, o Android en `md`) más el vuelo de los elementos que comparten
 * `data-transicion` (ver `ui/transiciones.ts`). Se eligió frente a View Transitions y a `layoutId`
 * de Motion porque es la única que sigue al gesto de volver, no congela la
 * página y no depende de la versión de Safari. Con movimiento reducido, un
 * fundido sin desplazamientos.
 */
export function transicionPagina(
  navEl: HTMLElement,
  opts: TransitionOptions,
): Animation {
  pendientes.forEach((limpiar) => limpiar());
  if (!movimientoPermitido()) return fundido(opts);
  const animacion =
    opts.mode === 'md'
      ? mdTransitionAnimation(navEl, opts)
      : iosTransitionAnimation(navEl, opts);
  try {
    const extra = vuelos(opts);
    if (extra) animacion.addAnimation(extra);
  } catch {
    // El vuelo es adorno: si algo falla, la transición normal sigue sirviendo.
  }
  return animacion;
}
