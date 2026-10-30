import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

import { useAgenda } from '../../queries';

/**
 * Provisional hasta la pantalla de partidos (S05): lista en bruto la agenda
 * del club para probar la capa de datos y la caché persistida.
 */
export function PartidosPage() {
  const { t } = useTranslation();
  const agenda = useAgenda();

  return (
    <IonPage data-testid="page-partidos">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('tabs.partidos')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {agenda.isPending ? (
          <p>{t('common.cargando')}</p>
        ) : agenda.isError ? (
          <>
            <p>{t('partidos.error')}</p>
            <IonButton onClick={() => void agenda.refetch()}>
              {t('common.reintentar')}
            </IonButton>
          </>
        ) : agenda.data.length === 0 ? (
          <p>{t('partidos.vacio')}</p>
        ) : (
          <IonList data-testid="agenda">
            {agenda.data.map((p) => (
              <IonItem key={p.id}>
                <IonLabel>
                  {p.fecha} {p.hora} · {p.local?.nombre ?? '—'} –{' '}
                  {p.visitante?.nombre ?? '—'}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}
