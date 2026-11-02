import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonIcon, IonSpinner, createGesture } from '@ionic/react';
import type { Gesture } from '@ionic/react';
import { arrowDown } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HUECO_LISTO, HUECO_MAX, HUECO_REFRESCANDO, huecoPara } from './goma';
import { movimientoPermitido } from './movimiento';

type Estado = 'reposo' | 'tirando' | 'listo' | 'refrescando' | 'cerrando';

/** Duración (ms) de abrir hasta `HUECO_REFRESCANDO` al soltar y de cerrar. */
const AL_SOLTAR_MS = 220;
const AL_CERRAR_MS = 280;

/**
 * Pull-to-refresh «desgarrado», como el de la v1: el contenido baja y deja
 * ver un hueco hundido detrás. Propio y no `IonRefresher` porque este no
 * limita lo que baja el contenido. Va en el slot `fixed` de `IonContent`.
 */
export function Desgarro({
  alRefrescar,
}: {
  alRefrescar: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const refrescarRef = useRef(alRefrescar);
  const [estado, setEstado] = useState<Estado>('reposo');

  useEffect(() => {
    refrescarRef.current = alRefrescar;
  }, [alRefrescar]);

  useEffect(() => {
    const el = ref.current;
    const content = el?.closest('ion-content');
    if (!el || !content) return;

    let vivo = true;
    let actual: Estado = 'reposo';
    let scrollEl: HTMLElement | undefined;
    let gesto: Gesture | undefined;
    let espera: ReturnType<typeof setTimeout> | undefined;

    const poner = (e: Estado) => {
      actual = e;
      setEstado(e);
    };

    // El hueco se escribe a mano en cada fotograma: con estado de React se
    // repintaría la página entera mientras se tira.
    const abrir = (px: number, ms: number) => {
      if (!scrollEl) return;
      const duracion = movimientoPermitido() ? `${ms}ms` : '0ms';
      scrollEl.style.transition = `transform ${duracion} ease-out`;
      scrollEl.style.transform = px > 0 ? `translateY(${px}px)` : '';
      scrollEl.style.overflow = px > 0 ? 'hidden' : '';
      el.style.setProperty('--hueco', `${px}px`);
      el.style.setProperty('--avance', String(Math.min(px / HUECO_LISTO, 1)));
      el.style.setProperty('--transicion', duracion);
      content.classList.toggle('desgarro-abierto', px > 0 || ms > 0);
    };

    const cerrar = () => {
      poner('cerrando');
      abrir(0, AL_CERRAR_MS);
      espera = setTimeout(
        () => {
          if (!vivo || !scrollEl) return;
          scrollEl.style.removeProperty('transition');
          content.classList.remove('desgarro-abierto');
          poner('reposo');
        },
        movimientoPermitido() ? AL_CERRAR_MS : 0,
      );
    };

    const tragar = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const refrescar = () => {
      poner('refrescando');
      abrir(HUECO_REFRESCANDO, AL_SOLTAR_MS);
      void refrescarRef.current().finally(() => vivo && cerrar());
    };

    void content.getScrollElement().then((s) => {
      if (!vivo) return;
      scrollEl = s;
      gesto = createGesture({
        el: content,
        gestureName: 'desgarro',
        gesturePriority: 31,
        direction: 'y',
        threshold: 10,
        passive: false,
        canStart: () => actual === 'reposo' && s.scrollTop <= 0,
        onMove: ({ deltaY, event }) => {
          if ('touches' in event && (event as TouchEvent).touches.length > 1)
            return;
          const hueco = huecoPara(deltaY);
          if (hueco <= 0) {
            abrir(0, 0);
            if (actual !== 'reposo') poner('tirando');
            return;
          }
          if (event.cancelable) event.preventDefault();
          abrir(hueco, 0);
          const listo = hueco >= HUECO_LISTO;
          if (listo && actual !== 'listo' && Capacitor.isNativePlatform())
            void Haptics.impact({ style: ImpactStyle.Light });
          poner(listo ? 'listo' : 'tirando');
        },
        onEnd: () => {
          // Con ratón, soltar sobre una tarjeta la abriría: se traga ese clic.
          if (actual !== 'reposo')
            content.addEventListener('click', tragar, {
              capture: true,
              once: true,
            });
          setTimeout(
            () => content.removeEventListener('click', tragar, true),
            0,
          );
          if (actual === 'listo') refrescar();
          else if (actual === 'tirando') cerrar();
        },
      });
      gesto.enable(true);
    });

    return () => {
      vivo = false;
      clearTimeout(espera);
      gesto?.destroy();
      content.classList.remove('desgarro-abierto');
      if (scrollEl) {
        scrollEl.style.removeProperty('transform');
        scrollEl.style.removeProperty('transition');
        scrollEl.style.removeProperty('overflow');
      }
    };
  }, []);

  const texto =
    estado === 'refrescando'
      ? t('common.refresco.actualizando')
      : estado === 'listo'
        ? t('common.refresco.soltar')
        : t('common.refresco.tirar');

  return (
    <div
      ref={ref}
      slot="fixed"
      className={`desgarro desgarro--${estado}`}
      style={{ height: HUECO_MAX }}
      data-testid="desgarro"
      data-estado={estado}
      aria-hidden={estado === 'reposo'}
    >
      <span className="desgarro__centro">
        <span className="desgarro__icono">
          {estado === 'refrescando' ? (
            <IonSpinner name="crescent" />
          ) : (
            <IonIcon icon={arrowDown} />
          )}
        </span>
        <span className="desgarro__texto" role="status">
          {estado === 'reposo' ? '' : texto}
        </span>
      </span>
    </div>
  );
}
