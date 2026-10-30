import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EstadoError } from './EstadoError';

interface Props<T> {
  consulta: UseQueryResult<T>;
  /** Texto del fallo, ya traducido. */
  error: string;
  /** Skeleton con la geometría del contenido; sin él, un texto de carga. */
  cargando?: ReactNode;
  children: (datos: T) => ReactNode;
}

/** Cargando / error con reintento / datos, igual en todas las pantallas. */
export function Consulta<T>({ consulta, error, cargando, children }: Props<T>) {
  const { t } = useTranslation();
  if (consulta.isPending) {
    return cargando ?? <p className="ion-padding">{t('common.cargando')}</p>;
  }
  if (consulta.isError) {
    return (
      <EstadoError texto={error} alReintentar={() => void consulta.refetch()} />
    );
  }
  return <>{children(consulta.data)}</>;
}
