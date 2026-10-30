import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
} from '@ionic/react';
import { informationCircleOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { LadoDetalle, PartidoDetalle } from '../../domain';
import { claves, usePartido, useRefrescar } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Pagina } from '../../ui/Pagina';
import { useRutas } from '../../ui/rutas';

/**
 * Provisional hasta el detalle de partido (S07): marcador del acta y
 * alineaciones, más una hoja con los datos del partido para probar sheets y
 * el back de Android sobre un modal.
 */
export function PartidoPage() {
  const { t } = useTranslation();
  const { partidoId } = useParams<'partidoId'>();
  const partido = usePartido(partidoId);
  const refrescar = useRefrescar(claves.partido(partidoId));
  const [info, setInfo] = useState(false);

  return (
    <Pagina
      titulo={t('partido.titulo')}
      testId="page-partido"
      detalle
      alRefrescar={refrescar}
      acciones={
        partido.data && (
          <IonButton
            onClick={() => setInfo(true)}
            aria-label={t('partido.info')}
            data-testid="abrir-info-partido"
          >
            <IonIcon slot="icon-only" icon={informationCircleOutline} />
          </IonButton>
        )
      }
    >
      <Consulta consulta={partido} error={t('partido.error')}>
        {(p) => (
          <>
            <h2 className="ion-padding-horizontal" data-testid="marcador">
              {p.local.equipo.nombreAbrev} {p.local.puntaje ?? '–'} ·{' '}
              {p.visitante.puntaje ?? '–'} {p.visitante.equipo.nombreAbrev}
            </h2>
            <Alineacion lado={p.local} />
            <Alineacion lado={p.visitante} />
            <HojaInfo
              partido={p}
              abierta={info}
              alCerrar={() => setInfo(false)}
            />
          </>
        )}
      </Consulta>
    </Pagina>
  );
}

function Alineacion({ lado }: { lado: LadoDetalle }) {
  const rutas = useRutas();
  return (
    <IonList>
      <IonListHeader>{lado.equipo.nombre}</IonListHeader>
      {lado.alineacion.jugadores.map((j) => (
        <IonItem
          key={j.plantillaEquipoId}
          routerLink={rutas.jugador(j.plantillaEquipoId)}
          detail
        >
          <IonLabel>{j.nombre}</IonLabel>
          {j.dorsal !== null && <IonNote slot="end">{j.dorsal}</IonNote>}
        </IonItem>
      ))}
    </IonList>
  );
}

function HojaInfo({
  partido,
  abierta,
  alCerrar,
}: {
  partido: PartidoDetalle;
  abierta: boolean;
  alCerrar: () => void;
}) {
  const { t } = useTranslation();
  return (
    <IonModal
      isOpen={abierta}
      onDidDismiss={alCerrar}
      initialBreakpoint={0.5}
      breakpoints={[0, 0.5, 1]}
      data-testid="hoja-info-partido"
    >
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonLabel>{t('partido.competicion')}</IonLabel>
            <IonNote slot="end">{partido.competicionNombre}</IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>{t('partido.fecha')}</IonLabel>
            <IonNote slot="end">
              {partido.fecha} {partido.hora ?? ''}
            </IonNote>
          </IonItem>
          {partido.pista && (
            <IonItem>
              <IonLabel>{t('partido.pista')}</IonLabel>
              <IonNote slot="end">{partido.pista}</IonNote>
            </IonItem>
          )}
          {partido.arbitros.length > 0 && (
            <IonItem>
              <IonLabel>{t('partido.arbitros')}</IonLabel>
              <IonNote slot="end">{partido.arbitros.join(', ')}</IonNote>
            </IonItem>
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
