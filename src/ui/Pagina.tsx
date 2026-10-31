import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { RefresherEventDetail, ScrollDetail } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { movimientoPermitido } from './movimiento';
import { useRutas } from './rutas';
import { useAccionesShell } from './shell';

interface Props {
  titulo: string;
  testId: string;
  /** Pantalla de detalle: lleva botón atrás en vez de ajustes. */
  detalle?: boolean;
  /** Pull-to-refresh; el spinner se queda hasta que la promesa termina. */
  alRefrescar?: () => Promise<unknown>;
  /** Botones extra a la derecha de la barra. */
  acciones?: ReactNode;
  /**
   * Versión compacta de la cabecera del contenido: al bajar, sustituye al
   * título en la barra mientras la cabecera se pliega (ver `--pliegue`).
   */
  compacta?: ReactNode;
  children: ReactNode;
}

/** Desplazamiento (px) en el que la cabecera queda plegada del todo. */
const PLIEGUE_PX = 120;

/** Esqueleto de pantalla: barra con atrás o ajustes, pull-to-refresh y contenido. */
export function Pagina({
  titulo,
  testId,
  detalle = false,
  alRefrescar,
  acciones,
  compacta,
  children,
}: Props) {
  const { t } = useTranslation();
  const { raiz } = useRutas();
  const { abrirAjustes } = useAccionesShell();

  const refrescar = (e: CustomEvent<RefresherEventDetail>) => {
    void alRefrescar?.().finally(() => void e.detail.complete());
  };

  const pliegue = useRef(0);
  // El avance (0–1) se escribe solo en los elementos `data-plegable` y no en
  // la página: una variable heredada en la raíz recalcularía todo el árbol en
  // cada fotograma del scroll.
  const plegar = (e: CustomEvent<ScrollDetail>) => {
    const avance = e.detail.scrollTop / PLIEGUE_PX;
    const p = movimientoPermitido()
      ? Math.min(Math.max(avance, 0), 1)
      : Number(avance >= 0.5);
    if (p === pliegue.current || !(e.target instanceof Element)) return;
    pliegue.current = p;
    e.target
      .closest('.ion-page')
      ?.querySelectorAll<HTMLElement>('[data-plegable]')
      .forEach((el) => el.style.setProperty('--pliegue', String(p)));
  };

  return (
    <IonPage data-testid={testId}>
      <IonHeader>
        <IonToolbar>
          {detalle && (
            <IonButtons slot="start">
              {/* defaultHref: si se entra por enlace directo, atrás va a la raíz de la pestaña. */}
              <IonBackButton defaultHref={raiz} text={t('common.atras')} />
            </IonButtons>
          )}
          <IonTitle>
            {compacta ? (
              <span className="pagina__titulos" data-plegable>
                <span className="pagina__titulo">{titulo}</span>
                <span className="pagina__compacta" aria-hidden>
                  {compacta}
                </span>
              </span>
            ) : (
              titulo
            )}
          </IonTitle>
          <IonButtons slot="end">
            {acciones}
            {!detalle && (
              <IonButton
                onClick={abrirAjustes}
                aria-label={t('ajustes.titulo')}
                data-testid="abrir-ajustes"
              >
                <IonIcon slot="icon-only" icon={settingsOutline} />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollEvents={!!compacta} onIonScroll={plegar}>
        {alRefrescar && (
          <IonRefresher slot="fixed" onIonRefresh={refrescar}>
            <IonRefresherContent />
          </IonRefresher>
        )}
        {children}
      </IonContent>
    </IonPage>
  );
}
