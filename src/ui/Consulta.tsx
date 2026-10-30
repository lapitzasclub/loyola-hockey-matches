import { IonButton } from '@ionic/react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props<T> {
  consulta: UseQueryResult<T>;
  /** Texto del fallo, ya traducido. */
  error: string;
  children: (datos: T) => ReactNode;
}

/** Cargando / error con reintento / datos, igual en todas las pantallas. */
export function Consulta<T>({ consulta, error, children }: Props<T>) {
  const { t } = useTranslation();
  if (consulta.isPending) {
    return <p className="ion-padding">{t('common.cargando')}</p>;
  }
  if (consulta.isError) {
    return (
      <div className="ion-padding">
        <p>{error}</p>
        <IonButton onClick={() => void consulta.refetch()}>
          {t('common.reintentar')}
        </IonButton>
      </div>
    );
  }
  return <>{children(consulta.data)}</>;
}
