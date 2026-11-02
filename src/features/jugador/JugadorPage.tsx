import {
  IonAccordion,
  IonAccordionGroup,
  IonIcon,
  IonItem,
  IonLabel,
  IonRouterLink,
} from '@ionic/react';
import { chevronForward, personOutline } from 'ionicons/icons';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { competicionPrincipal, equipoDelJugador } from '../../domain';
import type {
  CompeticionJugador,
  ContadoresJugador,
  EquipoDelJugador,
  FichaJugador,
  PartidoJugador,
} from '../../domain';
import {
  claves,
  useCalendarios,
  useDivisiones,
  useFichaJugador,
  useRefrescar,
} from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Escudo } from '../../ui/Escudo';
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

/** Totales de la temporada en cifras grandes, con su nombre completo. */
function Cifras({ ficha }: { ficha: FichaJugador }) {
  const { t } = useTranslation();
  const partidos = ficha.competiciones.reduce(
    (n, c) => n + c.partidosJugados,
    0,
  );
  const cifras = [
    { clave: 'partidos', valor: String(partidos) },
    ...contadoresVisibles(ficha.total, ficha.esPortero),
  ];
  return (
    <dl className="cifras" data-testid="jugador-cifras">
      {cifras.map(({ clave, valor }) => (
        <div key={clave} className="cifra">
          <dd className="cifra__valor">{valor}</dd>
          <dt className="cifra__etiqueta">{t(`jugador.etiquetas.${clave}`)}</dt>
        </div>
      ))}
    </dl>
  );
}

function Lado({
  equipo,
  suyo,
}: {
  equipo: PartidoJugador['local'];
  suyo: boolean;
}) {
  return (
    <span
      className={`jugador-partido__lado${suyo ? ' jugador-partido__lado--suyo' : ''}`}
    >
      <Escudo
        logoUrl={equipo.logoUrl}
        nombre={equipo.nombreAbrev}
        abreviatura={equipo.nombreAbrev}
        tamano={20}
      />
      <span>{equipo.nombreAbrev}</span>
    </span>
  );
}

function FilaPartido({
  partido,
  portero,
  suyo,
}: {
  partido: PartidoJugador;
  portero: boolean;
  suyo: string | null;
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
          <Lado
            equipo={partido.local}
            suyo={partido.local.nombreAbrev === suyo}
          />
          <strong className="jugador-partido__marcador">
            {m ? `${m.local} – ${m.visitante}` : '–'}
          </strong>
          <Lado
            equipo={partido.visitante}
            suyo={partido.visitante.nombreAbrev === suyo}
          />
        </span>
        <Chips contadores={partido.stats} portero={portero} />
      </span>
    </IonRouterLink>
  );
}

function Competicion({
  competicion,
  portero,
  suyo,
}: {
  competicion: CompeticionJugador;
  portero: boolean;
  suyo: string | null;
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
          <FilaPartido
            key={p.partidoId}
            partido={p}
            portero={portero}
            suyo={suyo}
          />
        ))}
      </div>
    </IonAccordion>
  );
}

/** Escudo y nombre del equipo; enlaza a su ficha cuando se sabe cuál es. */
function EnlaceEquipo({ equipo }: { equipo: EquipoDelJugador }) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const contenido = (
    <>
      <Escudo
        logoUrl={equipo.logoUrl}
        nombre={equipo.nombre}
        abreviatura={equipo.nombreAbrev}
        tamano={24}
      />
      <span className="jugador-equipo__nombre">{equipo.nombre}</span>
    </>
  );
  return equipo.enlace ? (
    <IonRouterLink
      routerLink={rutas.equipo(equipo.enlace)}
      className="jugador-equipo jugador-equipo--enlace"
      aria-label={t('partido.verEquipo', { equipo: equipo.nombre })}
      data-testid="jugador-equipo"
    >
      <span className="jugador-equipo__interior">
        {contenido}
        <IonIcon icon={chevronForward} aria-hidden="true" />
      </span>
    </IonRouterLink>
  ) : (
    <span className="jugador-equipo" data-testid="jugador-equipo">
      <span className="jugador-equipo__interior">{contenido}</span>
    </span>
  );
}

function Cabecera({
  ficha,
  equipo,
}: {
  ficha: FichaJugador;
  equipo: EquipoDelJugador | null;
}) {
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
      <FotoPersona nombre={ficha.nombre} fotoUrl={ficha.fotoUrl} tamano={88} />
      <h1 className="jugador-cabecera__nombre">{ficha.nombre}</h1>
      <p className="jugador-cabecera__datos">{datos.join(' · ')}</p>
      {equipo && <EnlaceEquipo equipo={equipo} />}
    </header>
  );
}

function CabeceraSkeleton() {
  return (
    <div className="jugador-cabecera" data-testid="jugador-skeleton">
      <Skeleton ancho={88} alto={88} redondo />
      <Skeleton ancho={160} alto={18} />
    </div>
  );
}

/** Ficha de un jugador: cabecera con su equipo, cifras de la temporada y cada competición. */
export function JugadorPage() {
  const { t } = useTranslation();
  const { plantillaEquipoId } = useParams<'plantillaEquipoId'>();
  const ficha = useFichaJugador(plantillaEquipoId);
  const refrescar = useRefrescar(claves.fichaJugador(plantillaEquipoId));
  // La ficha no dice el equipo: se deduce de sus partidos y se busca en los
  // calendarios de las divisiones de su competición principal.
  const principal = ficha.data ? competicionPrincipal(ficha.data) : undefined;
  const divisiones = useDivisiones(principal ? [principal.competicionId] : []);
  const calendarios = useCalendarios(divisiones.data ?? []);
  // Barato: unas decenas de partidos por división.
  const equipo = ficha.data
    ? equipoDelJugador(
        ficha.data,
        (divisiones.data ?? []).flatMap((division, i) => {
          const datos = calendarios[i]?.data;
          return datos ? [{ division, partidos: datos.partidos }] : [];
        }),
      )
    : null;

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
              <Cabecera ficha={f} equipo={equipo} />
              <section className="seccion">
                <h2 className="seccion__titulo">{t('jugador.temporada')}</h2>
                <Cifras ficha={f} />
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
                    className="jugador-competiciones"
                    value={competiciones[0]?.competicionId}
                    data-testid="jugador-competiciones"
                  >
                    {competiciones.map((c) => (
                      <Competicion
                        key={c.competicionId}
                        competicion={c}
                        portero={f.esPortero}
                        suyo={equipo?.nombreAbrev ?? null}
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
