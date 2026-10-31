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
import { chevronForward } from 'ionicons/icons';
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

const resultado = (m: Marcador) => `${m.local} – ${m.visitante}`;

function Lado({ equipo }: { equipo: Equipo | null }) {
  const { t } = useTranslation();
  const nombre = equipo?.nombre ?? t('partidos.porDefinir');
  return (
    <span className="jornada__lado">
      <Escudo
        logoUrl={equipo?.logoUrl ?? null}
        nombre={nombre}
        abreviatura={equipo?.nombreAbrev}
        tamano={28}
      />
      <span className="jornada__nombre">{nombre}</span>
    </span>
  );
}

/** Hoja con todos los partidos de una jornada; tocar uno abre su detalle. */
export function HojaJornada({
  alCerrar,
  jornada,
  partidos,
  actualId,
  rutaPartido,
}: Props) {
  const { t, i18n } = useTranslation();
  return (
    <IonModal isOpen onDidDismiss={alCerrar} data-testid="hoja-jornada">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{jornada}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={alCerrar}>{t('common.cerrar')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <h2 className="jornada__titulo">{t('jornada.titulo')}</h2>
        <ul className="jornada">
          {partidos.map(({ partido, estado, marcador }) => {
            const actual = partido.id === actualId;
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
                    {formatoDia(partido.fecha, i18n.language)}
                    <InsigniaEstado estado={estado} />
                  </span>
                  <span className="jornada__cruce">
                    <Lado equipo={partido.local} />
                    <span className="jornada__centro">
                      {marcador
                        ? resultado(marcador)
                        : estado === 'aplazado'
                          ? '—'
                          : (partido.hora ?? '--:--')}
                    </span>
                    <Lado equipo={partido.visitante} />
                  </span>
                  <IonIcon className="jornada__flecha" icon={chevronForward} />
                </IonRouterLink>
              </li>
            );
          })}
        </ul>
      </IonContent>
    </IonModal>
  );
}
