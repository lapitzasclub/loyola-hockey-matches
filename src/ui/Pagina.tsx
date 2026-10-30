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
import type { RefresherEventDetail } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
  children: ReactNode;
}

/** Esqueleto de pantalla: barra con atrás o ajustes, pull-to-refresh y contenido. */
export function Pagina({
  titulo,
  testId,
  detalle = false,
  alRefrescar,
  acciones,
  children,
}: Props) {
  const { t } = useTranslation();
  const { raiz } = useRutas();
  const { abrirAjustes } = useAccionesShell();

  const refrescar = (e: CustomEvent<RefresherEventDetail>) => {
    void alRefrescar?.().finally(() => void e.detail.complete());
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
          <IonTitle>{titulo}</IonTitle>
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
      <IonContent>
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
