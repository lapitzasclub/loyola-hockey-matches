import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EstadoError } from './EstadoError';
import { Revelado, useEspera } from './Revelado';

interface Props<T> {
  consulta: UseQueryResult<T>;
  /** Texto del fallo, ya traducido. */
  error: string;
  /** Skeleton con la geometría del contenido; sin él, un texto de carga. */
  cargando?: ReactNode;
  /**
   * Si el contenido sustituye al skeleton con `Revelado`. Falso cuando la
   * pantalla decide qué revela (el partido conserva la cabecera previa).
   */
  revelar?: boolean;
  children: (datos: T) => ReactNode;
}

/** Cargando / error con reintento / datos, igual en todas las pantallas. */
export function Consulta<T>({
  consulta,
  error,
  cargando,
  revelar = true,
  children,
}: Props<T>) {
  const { t } = useTranslation();
  const espera = useEspera(consulta.isPending);
  if (consulta.isPending) {
    return cargando ?? <p className="ion-padding">{t('common.cargando')}</p>;
  }
  if (consulta.isError) {
    return (
      <EstadoError texto={error} alReintentar={() => void consulta.refetch()} />
    );
  }
  if (!revelar) return <>{children(consulta.data)}</>;
  return (
    <Revelado espera={espera} saliente={cargando}>
      {children(consulta.data)}
    </Revelado>
  );
}
