import {
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { agruparClasificacion } from '../../domain';
import type { EquipoCatalogo } from '../../domain';
import {
  claves,
  useCatalogo,
  useClasificacion,
  useFases,
  useRefrescar,
} from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Pagina } from '../../ui/Pagina';
import { useRutas } from '../../ui/rutas';

/**
 * Provisional hasta la pantalla de clasificación (S06): la tabla de la
 * primera fase de la división del equipo elegido, para probar la pila
 * clasificación → equipo → partido → jugador.
 */
export function ClasificacionPage() {
  const { t } = useTranslation();
  const catalogo = useCatalogo();
  const [elegido, setElegido] = useState(0);
  const entrada = catalogo.data?.[elegido] ?? catalogo.data?.[0];
  const divisionId = entrada?.division.id;
  const fases = useFases(divisionId);
  const fase = fases.data?.[0];
  const clasificacion = useClasificacion(fase?.id);
  const refrescar = useRefrescar(
    claves.fases(divisionId),
    claves.clasificacion(fase?.id),
  );

  return (
    <Pagina
      titulo={t('tabs.clasificacion')}
      testId="page-clasificacion"
      alRefrescar={refrescar}
    >
      <Consulta consulta={catalogo} error={t('clasificacion.error')}>
        {(equipos) => (
          <>
            <IonList>
              <IonItem>
                <IonSelect
                  label={t('clasificacion.equipo')}
                  value={elegido}
                  onIonChange={(e) => setElegido(Number(e.detail.value))}
                  interface="action-sheet"
                  cancelText={t('common.cancelar')}
                >
                  {equipos.map((e, i) => (
                    <IonSelectOption key={claveEntrada(e)} value={i}>
                      {e.competicion.nombre} · {e.equipo.nombre}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </IonList>
            {fase && entrada && (
              <Consulta
                consulta={clasificacion}
                error={t('clasificacion.error')}
              >
                {(filas) => (
                  <Tablas
                    entrada={entrada}
                    tablas={agruparClasificacion(fase, filas)}
                  />
                )}
              </Consulta>
            )}
          </>
        )}
      </Consulta>
    </Pagina>
  );
}

const claveEntrada = (e: EquipoCatalogo) =>
  `${e.division.id}:${e.equipo.inscripcionId ?? e.equipo.equipoId ?? e.equipo.nombre}`;

function Tablas({
  entrada,
  tablas,
}: {
  entrada: EquipoCatalogo;
  tablas: ReturnType<typeof agruparClasificacion>;
}) {
  const { t } = useTranslation();
  const rutas = useRutas();
  if (tablas.length === 0) {
    return <p className="ion-padding">{t('clasificacion.vacia')}</p>;
  }
  return tablas.map((tabla) => (
    <IonList key={tabla.grupo?.id ?? 'unica'} data-testid="clasificacion">
      {tabla.grupo && <IonListHeader>{tabla.grupo.nombre}</IonListHeader>}
      {tabla.filas.map((fila) => (
        <IonItem
          key={fila.equipo.inscripcionId}
          detail
          routerLink={
            fila.equipo.inscripcionId
              ? rutas.equipo({
                  competicionId: entrada.competicion.id,
                  divisionId: entrada.division.id,
                  inscripcionId: fila.equipo.inscripcionId,
                })
              : undefined
          }
        >
          <IonLabel>
            {fila.puesto}. {fila.equipo.nombre}
          </IonLabel>
          <IonNote slot="end">
            {t('clasificacion.puntos', { count: fila.pts })}
          </IonNote>
        </IonItem>
      ))}
    </IonList>
  ));
}
