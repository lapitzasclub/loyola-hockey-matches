import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonRouterLink,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { chevronForward, closeOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import type { Equipo, Marcador, PartidoVisible } from '../domain';
import { Escudo } from './Escudo';
import { formatoDia } from './formato';
import { InsigniaEstado } from './InsigniaEstado';

interface Props {
  alCerrar: () => void;
  /** Nombre de la jornada, tal cual lo da la federación. */
  jornada: string;
  /** Los de la jornada, por fecha y hora. */
  partidos: readonly PartidoVisible[];
  /** El partido desde el que se abrió: se resalta. */
  actualId: string;
  rutaPartido: (id: string) => string;
}

function Lado({
  equipo,
  goles,
  gana,
}: {
  equipo: Equipo | null;
  goles: number | null;
  gana: boolean;
}) {
  const { t } = useTranslation();
  const nombre = equipo?.nombre ?? t('partidos.porDefinir');
  return (
    <span className={`jornada__lado${gana ? ' jornada__lado--gana' : ''}`}>
      <Escudo
        logoUrl={equipo?.logoUrl ?? null}
        nombre={nombre}
        abreviatura={equipo?.nombreAbrev}
        tamano={26}
      />
      <span className="jornada__nombre">{nombre}</span>
      {goles !== null && <span className="jornada__goles">{goles}</span>}
    </span>
  );
}

const gana = (m: Marcador | null, lado: 'local' | 'visitante') =>
  !!m && m[lado] > m[lado === 'local' ? 'visitante' : 'local'];

/**
 * Hoja con todos los partidos de una jornada, en forma de marcador: un equipo
 * por línea y sus goles a la derecha. Tocar uno abre su detalle.
 */
export function HojaJornada({
  alCerrar,
  jornada,
  partidos,
  actualId,
  rutaPartido,
}: Props) {
  const { t, i18n } = useTranslation();
  return (
    <IonModal
      isOpen
      onDidDismiss={alCerrar}
      data-testid="hoja-jornada"
      className="hoja-jornada"
      breakpoints={[0, 0.75, 1]}
      initialBreakpoint={0.75}
      handle
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <span className="jornada__titulo">{jornada}</span>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={alCerrar} aria-label={t('common.cerrar')}>
              <IonIcon slot="icon-only" icon={closeOutline} aria-hidden />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ul className="jornada" aria-label={t('jornada.titulo')}>
          {partidos.map(({ partido, estado, marcador }) => {
            const actual = partido.id === actualId;
            const hora =
              estado === 'aplazado' || marcador ? null : partido.hora;
            return (
              <li key={partido.id}>
                <IonRouterLink
                  routerLink={rutaPartido(partido.id)}
                  className={`jornada__fila${actual ? ' jornada__fila--actual' : ''}`}
                  aria-current={actual ? 'true' : undefined}
                  data-testid="jornada-partido"
                  data-partido={partido.id}
                  onClick={alCerrar}
                >
                  <span className="jornada__fecha">
                    <span>
                      {[formatoDia(partido.fecha, i18n.language), hora]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <InsigniaEstado estado={estado} />
                  </span>
                  <Lado
                    equipo={partido.local}
                    goles={marcador?.local ?? null}
                    gana={gana(marcador, 'local')}
                  />
                  <Lado
                    equipo={partido.visitante}
                    goles={marcador?.visitante ?? null}
                    gana={gana(marcador, 'visitante')}
                  />
                  <IonIcon
                    className="jornada__flecha"
                    icon={chevronForward}
                    aria-hidden
                  />
                </IonRouterLink>
              </li>
            );
          })}
        </ul>
      </IonContent>
    </IonModal>
  );
}
