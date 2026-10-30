import { IonItem, IonLabel, IonList, IonNote } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { claves, useFichaJugador, useRefrescar } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Pagina } from '../../ui/Pagina';

/** Provisional hasta la ficha de jugador (S07): totales de la temporada. */
export function JugadorPage() {
  const { t } = useTranslation();
  const { plantillaEquipoId } = useParams<'plantillaEquipoId'>();
  const ficha = useFichaJugador(plantillaEquipoId);
  const refrescar = useRefrescar(claves.fichaJugador(plantillaEquipoId));

  return (
    <Pagina
      titulo={ficha.data?.nombre ?? t('jugador.titulo')}
      testId="page-jugador"
      detalle
      alRefrescar={refrescar}
    >
      <Consulta consulta={ficha} error={t('jugador.error')}>
        {(f) => (
          <IonList data-testid="ficha-jugador">
            {f.competiciones.map((c) => (
              <IonItem key={c.competicionId}>
                <IonLabel>{c.nombre}</IonLabel>
                <IonNote slot="end">
                  {t('jugador.resumen', {
                    partidos: c.partidosJugados,
                    goles: c.total.goles,
                  })}
                </IonNote>
              </IonItem>
            ))}
          </IonList>
        )}
      </Consulta>
    </Pagina>
  );
}
