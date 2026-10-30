import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

interface Props {
  /** Clave i18n del título de la pestaña. */
  titleKey: string;
  testId: string;
}

/** Pantalla provisional de una pestaña hasta que su feature se implemente. */
export function EmptyTabPage({ titleKey, testId }: Props) {
  const { t } = useTranslation();
  return (
    <IonPage data-testid={testId}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t(titleKey)}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>{t('common.proximamente')}</p>
      </IonContent>
    </IonPage>
  );
}
