import { IonButton } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import { EstadoVacio } from './EstadoVacio';

interface Props {
  /** Texto del fallo, ya traducido. */
  texto: string;
  alReintentar: () => void;
}

export function EstadoError({ texto, alReintentar }: Props) {
  const { t } = useTranslation();
  return (
    <EstadoVacio
      testId="estado-error"
      icono={cloudOfflineOutline}
      titulo={t('common.error')}
      texto={texto}
      accion={
        <IonButton fill="outline" onClick={alReintentar}>
          {t('common.reintentar')}
        </IonButton>
      }
    />
  );
}
