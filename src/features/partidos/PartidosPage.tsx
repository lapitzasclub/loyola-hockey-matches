import { IonItem, IonLabel, IonList } from '@ionic/react';
import { useTranslation } from 'react-i18next';

import { claves, useAgenda, useRefrescar } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Pagina } from '../../ui/Pagina';
import { useRutas } from '../../ui/rutas';

/**
 * Provisional hasta la pantalla de partidos (S05): lista en bruto la agenda
 * del club para probar la capa de datos, la caché persistida y la navegación.
 */
export function PartidosPage() {
  const { t } = useTranslation();
  const agenda = useAgenda();
  const refrescar = useRefrescar(claves.agenda());
  const rutas = useRutas();

  return (
    <Pagina
      titulo={t('tabs.partidos')}
      testId="page-partidos"
      alRefrescar={refrescar}
    >
      <Consulta consulta={agenda} error={t('partidos.error')}>
        {(partidos) =>
          partidos.length === 0 ? (
            <p className="ion-padding">{t('partidos.vacio')}</p>
          ) : (
            <IonList data-testid="agenda">
              {partidos.map((p) => (
                <IonItem key={p.id} routerLink={rutas.partido(p.id)} detail>
                  <IonLabel>
                    {p.fecha} {p.hora} · {p.local?.nombre ?? '—'} –{' '}
                    {p.visitante?.nombre ?? '—'}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )
        }
      </Consulta>
    </Pagina>
  );
}
