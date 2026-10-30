import { useTranslation } from 'react-i18next';

import { Pagina } from '../../ui/Pagina';

/** Provisional hasta la pestaña de estadísticas (S08). */
export function EstadisticasPage() {
  const { t } = useTranslation();
  return (
    <Pagina titulo={t('tabs.estadisticas')} testId="page-estadisticas">
      <p className="ion-padding">{t('common.proximamente')}</p>
    </Pagina>
  );
}
