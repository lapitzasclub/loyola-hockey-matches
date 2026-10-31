import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { RefresherEventDetail, ScrollDetail } from '@ionic/react';
import { chevronDown } from 'ionicons/icons';
import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { movimientoPermitido } from './movimiento';
import { modoIonic } from './plataforma';
import { useRutas } from './rutas';
import { MENU_AJUSTES, useShell } from './shell';
import { Skeleton } from './Skeleton';

interface Props {
  titulo: string;
  testId: string;
  /**
   * Pantalla de detalle: lleva botón atrás y el título. Las raíces de las
   * pestañas llevan el menú y, en vez del título, el equipo elegido.
   */
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

/**
 * Equipo elegido y su liga, siempre a la vista en las pestañas; al tocarlo se
 * cambia. El nombre de la pestaña ya lo dice la tab bar.
 */
function CabeceraEquipo() {
  const { t } = useTranslation();
  const { equipo, abrirSelector } = useShell();
  if (equipo === undefined) {
    return (
      <span className="cabecera-equipo">
        <span className="escudo-club" aria-hidden />
        <span className="cabecera-equipo__textos">
          <Skeleton ancho={150} alto={16} />
          <Skeleton ancho={110} alto={10} />
        </span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="cabecera-equipo"
      onClick={abrirSelector}
      aria-haspopup="dialog"
      data-testid={equipo ? 'cabecera-equipo' : undefined}
    >
      <span className="escudo-club" aria-hidden />
      <span className="cabecera-equipo__textos">
        <span className="cabecera-equipo__nombre">
          {equipo?.nombre ?? t('app.club')}
        </span>
        {equipo && (
          <span className="cabecera-equipo__liga">{equipo.competicion}</span>
        )}
      </span>
    </button>
  );
}

/** Esqueleto de pantalla: barra con atrás o menú, pull-to-refresh y contenido. */
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
      <IonHeader aria-label={detalle ? undefined : titulo}>
        <IonToolbar>
          <IonButtons slot="start">
            {detalle ? (
              /* defaultHref: si se entra por enlace directo, atrás va a la raíz de la pestaña.
                  En Android, solo la flecha, como en el resto del sistema. */
              <IonBackButton
                defaultHref={raiz}
                text={modoIonic() === 'md' ? '' : t('common.atras')}
                aria-label={t('common.atras')}
              />
            ) : (
              <IonMenuButton
                menu={MENU_AJUSTES}
                autoHide={false}
                aria-label={t('ajustes.abrir')}
                data-testid="abrir-ajustes"
              />
            )}
          </IonButtons>
          {detalle ? (
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
          ) : (
            <CabeceraEquipo />
          )}
          {acciones && <IonButtons slot="end">{acciones}</IonButtons>}
        </IonToolbar>
      </IonHeader>
      <IonContent scrollEvents={!!compacta} onIonScroll={plegar}>
        {alRefrescar && (
          /* Con un icono propio Ionic usa el refresher clásico también en md: el
              contenido baja y deja ver el hueco «desgarrado» de detrás, como en
              la v1. «Suelta…» no tiene texto propio en Ionic: lo pinta el CSS. */
          <IonRefresher
            slot="fixed"
            className="desgarro"
            /* pullMin es lo que baja el contenido mientras actualiza: debe
                dejar ver entero el icono y el texto. Por defecto, pullMax
                (pullMin + 60) dispara el refresco solo al pasar de ahí,
                aunque el dedo siga en pantalla. */
            pullMin={84}
            pullMax={1000}
            onIonRefresh={refrescar}
            style={
              {
                '--texto-soltar': JSON.stringify(t('common.refresco.soltar')),
              } as CSSProperties
            }
          >
            <IonRefresherContent
              pullingIcon={chevronDown}
              pullingText={t('common.refresco.tirar')}
              refreshingSpinner="crescent"
              refreshingText={t('common.refresco.actualizando')}
            />
          </IonRefresher>
        )}
        {children}
      </IonContent>
    </IonPage>
  );
}
