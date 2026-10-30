import {
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonLabel,
  IonRouterLink,
} from '@ionic/react';
import { personOutline } from 'ionicons/icons';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type {
  CompeticionJugador,
  ContadoresJugador,
  FichaJugador,
  PartidoJugador,
} from '../../domain';
import { claves, useFichaJugador, useRefrescar } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { formatoDia } from '../../ui/formato';
import { FotoPersona } from '../../ui/FotoPersona';
import { Pagina } from '../../ui/Pagina';
import { useRutas } from '../../ui/rutas';
import { Skeleton } from '../../ui/Skeleton';
import { contadoresVisibles } from './contadores';

// La gráfica no hace falta hasta abrir una competición: fuera del arranque.
const GraficaPartidos = lazy(() => import('./GraficaPartidos'));

/** Partidos a partir de los cuales una gráfica aporta algo. */
const MIN_PARTIDOS_GRAFICA = 2;

function Chips({
  contadores,
  portero,
}: {
  contadores: ContadoresJugador;
  portero: boolean;
}) {
  const { t } = useTranslation();
  const visibles = contadoresVisibles(contadores, portero);
  if (visibles.length === 0) return null;
  return (
    <div className="dato-chips">
      {visibles.map(({ clave, valor }) => (
        <span key={clave} className="dato-chip" data-testid="contador">
          {t(`jugador.contadores.${clave}`)} <strong>{valor}</strong>
        </span>
      ))}
    </div>
  );
}

function FilaPartido({
  partido,
  portero,
}: {
  partido: PartidoJugador;
  portero: boolean;
}) {
  const { i18n } = useTranslation();
  const rutas = useRutas();
  const { marcadorOficial: m } = partido;
  return (
    <IonRouterLink
      routerLink={rutas.partido(partido.partidoId)}
      className="persona persona--enlace"
      data-testid="jugador-partido"
    >
      <span className="jugador-partido">
        <span className="jugador-partido__fecha">
          {formatoDia(partido.fecha, i18n.language)}
        </span>
        <span className="jugador-partido__cruce">
          {partido.local.nombreAbrev}
          <strong>{m ? `${m.local} – ${m.visitante}` : '–'}</strong>
          {partido.visitante.nombreAbrev}
        </span>
        <Chips contadores={partido.stats} portero={portero} />
      </span>
    </IonRouterLink>
  );
}

function Competicion({
  competicion,
  portero,
}: {
  competicion: CompeticionJugador;
  portero: boolean;
}) {
  const { t } = useTranslation();
  return (
    <IonAccordion value={competicion.competicionId}>
      <IonItem slot="header" data-testid="jugador-competicion">
        <IonLabel>
          <h3>{competicion.nombre}</h3>
          <p>{t('jugador.partidos', { count: competicion.partidosJugados })}</p>
        </IonLabel>
      </IonItem>
      <div slot="content">
        <Chips contadores={competicion.total} portero={portero} />
        {competicion.partidos.length >= MIN_PARTIDOS_GRAFICA && (
          <Suspense fallback={<Skeleton ancho="100%" alto={120} />}>
            <GraficaPartidos
              partidos={competicion.partidos}
              portero={portero}
            />
          </Suspense>
        )}
        {competicion.partidos.map((p) => (
          <FilaPartido key={p.partidoId} partido={p} portero={portero} />
        ))}
      </div>
    </IonAccordion>
  );
}

function Cabecera({ ficha }: { ficha: FichaJugador }) {
  const { t } = useTranslation();
  const datos = [
    t(`jugador.rol.${ficha.esPortero ? 'portero' : 'jugador'}`),
    ficha.nacionalidad,
    ficha.anioNacimiento
      ? t('jugador.nacimiento', { anio: ficha.anioNacimiento })
      : null,
  ].filter(Boolean);
  return (
    <header className="jugador-cabecera" data-testid="jugador-cabecera">
      <FotoPersona nombre={ficha.nombre} fotoUrl={ficha.fotoUrl} tamano={64} />
      <div>
        <h1 className="jugador-cabecera__nombre">{ficha.nombre}</h1>
        <p className="jugador-cabecera__datos">{datos.join(' · ')}</p>
      </div>
    </header>
  );
}

function CabeceraSkeleton() {
  return (
    <div className="jugador-cabecera" data-testid="jugador-skeleton">
      <Skeleton ancho={64} alto={64} redondo />
      <Skeleton ancho={160} alto={18} />
    </div>
  );
}

/** Ficha de un jugador: cabecera compacta, totales de la temporada y cada competición. */
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
      <Consulta
        consulta={ficha}
        error={t('jugador.error')}
        cargando={<CabeceraSkeleton />}
      >
        {(f) => {
          // Con más partidos primero, como en la v1; la primera va abierta.
          const competiciones = [...f.competiciones].sort(
            (a, b) => b.partidosJugados - a.partidosJugados,
          );
          return (
            <div data-testid="ficha-jugador">
              <Cabecera ficha={f} />
              <section className="seccion">
                <h2 className="seccion__titulo">{t('jugador.temporada')}</h2>
                <Chips contadores={f.total} portero={f.esPortero} />
              </section>
              {competiciones.length === 0 ? (
                <EstadoVacio
                  testId="jugador-sin-partidos"
                  icono={personOutline}
                  titulo={t('jugador.sinPartidos')}
                />
              ) : (
                <section className="seccion">
                  <h2 className="seccion__titulo">
                    {t('jugador.competiciones')}
                  </h2>
                  <IonAccordionGroup
                    value={competiciones[0]?.competicionId}
                    data-testid="jugador-competiciones"
                  >
                    {competiciones.map((c) => (
                      <Competicion
                        key={c.competicionId}
                        competicion={c}
                        portero={f.esPortero}
                      />
                    ))}
                  </IonAccordionGroup>
                </section>
              )}
            </div>
          );
        }}
      </Consulta>
    </Pagina>
  );
}
