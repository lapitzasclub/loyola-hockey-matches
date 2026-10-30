import { IonItem, IonLabel, IonList, IonNote } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { juega } from '../../domain';
import type { PartidoResumen } from '../../domain';
import { claves, useCalendario, useRefrescar } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Pagina } from '../../ui/Pagina';
import { useRutas } from '../../ui/rutas';
import type { ParamsEquipo } from '../../ui/rutas';

const nombreEquipo = (partidos: PartidoResumen[], inscripcionId: string) => {
  for (const p of partidos) {
    for (const e of [p.local, p.visitante]) {
      if (e?.inscripcionId === inscripcionId) return e.nombre;
    }
  }
  return null;
};

/** Provisional hasta el detalle de equipo (S06): sus partidos de la división. */
export function EquipoPage() {
  const { t } = useTranslation();
  const { competicionId, divisionId, inscripcionId } =
    useParams<keyof ParamsEquipo>();
  const calendario = useCalendario(
    competicionId && divisionId ? { id: divisionId, competicionId } : undefined,
  );
  const refrescar = useRefrescar(claves.division(divisionId));
  const rutas = useRutas();
  const nombre =
    calendario.data && inscripcionId
      ? nombreEquipo(calendario.data.partidos, inscripcionId)
      : null;

  return (
    <Pagina
      titulo={nombre ?? t('equipo.titulo')}
      testId="page-equipo"
      detalle
      alRefrescar={refrescar}
    >
      <Consulta consulta={calendario} error={t('equipo.error')}>
        {({ partidos }) => (
          <IonList data-testid="partidos-equipo">
            {partidos
              .filter((p) => inscripcionId && juega(p, inscripcionId))
              .map((p) => (
                <IonItem key={p.id} routerLink={rutas.partido(p.id)} detail>
                  <IonLabel>
                    {p.local?.nombreAbrev ?? '—'} –{' '}
                    {p.visitante?.nombreAbrev ?? '—'}
                  </IonLabel>
                  <IonNote slot="end">
                    {p.marcador
                      ? `${p.marcador.local}-${p.marcador.visitante}`
                      : p.fecha}
                  </IonNote>
                </IonItem>
              ))}
          </IonList>
        )}
      </Consulta>
    </Pagina>
  );
}
