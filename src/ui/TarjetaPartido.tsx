import { IonRouterLink } from '@ionic/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { mismoEquipo } from '../domain';
import type {
  Equipo,
  Marcador,
  PartidoResumen,
  PartidoVisible,
} from '../domain';
import { Cifra } from './Cifra';
import { EnlacePista } from './EnlacePista';
import { Escudo } from './Escudo';
import { formatoDia } from './formato';
import { HojaJornada } from './HojaJornada';
import { InsigniaEstado } from './InsigniaEstado';
import { Skeleton } from './Skeleton';
import { useRutas } from './rutas';
import { recordarTarjeta } from './tarjetaPulsada';
import { transicion } from './transiciones';

interface Props {
  visible: PartidoVisible;
  /** Equipo cuyo calendario se ve: se resalta en la tarjeta. */
  propio?: Equipo;
  /** El partido al que lleva la lista al abrirse. */
  proximo?: boolean;
  /** Ruta de detalle; sin ella la tarjeta no es enlace. */
  href?: string;
  /**
   * Los partidos de la jornada de uno; con ella el nombre de la jornada se
   * puede pulsar para verlos. Se llama solo al abrir la hoja.
   */
  jornadaDe?: (partido: PartidoResumen) => readonly PartidoVisible[];
}

function Lado({
  equipo,
  propio,
  partidoId,
  lado,
}: {
  equipo: Equipo | null;
  propio: boolean;
  partidoId: string;
  lado: 'local' | 'visitante';
}) {
  const { t } = useTranslation();
  const nombre = equipo?.nombre ?? t('partidos.porDefinir');
  return (
    <div className={`tarjeta__lado${propio ? ' tarjeta__lado--propio' : ''}`}>
      <Escudo
        logoUrl={equipo?.logoUrl ?? null}
        nombre={nombre}
        abreviatura={equipo?.nombreAbrev}
        transicion={
          equipo ? transicion.escudoPartido(partidoId, lado) : undefined
        }
      />
      <span
        className="tarjeta__nombre"
        data-transicion={
          equipo ? transicion.nombrePartido(partidoId, lado) : undefined
        }
      >
        {nombre}
      </span>
    </div>
  );
}

function Centro({
  visible: { marcador, oficial, partido, estado },
}: {
  visible: PartidoVisible;
}) {
  const { t } = useTranslation();
  const resultado = (m: Marcador) => `${m.local} – ${m.visitante}`;
  if (marcador) {
    return (
      <div className="tarjeta__centro" data-testid="marcador">
        <span
          className="tarjeta__marcador"
          data-transicion={transicion.marcador(partido.id)}
        >
          <Cifra valor={resultado(marcador)} />
        </span>
        {oficial && (
          <span className="tarjeta__oficial">
            {t('partidos.oficial', { resultado: resultado(oficial) })}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="tarjeta__centro">
      <span
        className="tarjeta__hora"
        aria-label={partido.hora ? undefined : t('partidos.sinHora')}
        data-transicion={transicion.marcador(partido.id)}
      >
        {estado === 'aplazado' ? '—' : (partido.hora ?? '--:--')}
      </span>
    </div>
  );
}

export function TarjetaPartido({
  visible,
  propio,
  proximo,
  href,
  jornadaDe,
}: Props) {
  const { t, i18n } = useTranslation();
  const rutas = useRutas();
  const [hoja, setHoja] = useState(false);
  const { partido, estado } = visible;
  const esPropio = (e: Equipo | null) =>
    !!(propio && e && mismoEquipo(e, propio));

  const clases = [
    'tarjeta',
    `tarjeta--${estado}`,
    proximo ? 'tarjeta--proximo' : '',
  ].join(' ');

  const contenido = (
    <>
      <header className="tarjeta__cabecera">
        <span className="tarjeta__fecha">
          {proximo && (
            <span className="tarjeta__proximo">{t('partidos.proximo')}</span>
          )}
          {formatoDia(partido.fecha, i18n.language)}
          {partido.jornada && ' · '}
          {partido.jornada &&
            (jornadaDe ? (
              <span
                role="button"
                tabIndex={0}
                className="tarjeta__jornada"
                aria-label={t('jornada.ver', { jornada: partido.jornada })}
                data-testid="tarjeta-jornada"
                onClick={(e) => {
                  // La tarjeta es un enlace al detalle: esto no navega.
                  e.preventDefault();
                  e.stopPropagation();
                  setHoja(true);
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  e.stopPropagation();
                  setHoja(true);
                }}
              >
                {partido.jornada}
              </span>
            ) : (
              partido.jornada
            ))}
        </span>
        <InsigniaEstado estado={estado} />
      </header>
      <div className="tarjeta__cruce">
        <Lado
          equipo={partido.local}
          propio={esPropio(partido.local)}
          partidoId={partido.id}
          lado="local"
        />
        <Centro visible={visible} />
        <Lado
          equipo={partido.visitante}
          propio={esPropio(partido.visitante)}
          partidoId={partido.id}
          lado="visitante"
        />
      </div>
      {partido.pista && (
        <footer className="tarjeta__pie">
          <EnlacePista
            pista={partido.pista}
            coordenadas={partido.coordenadas}
            anidado={!!href}
          />
        </footer>
      )}
    </>
  );

  // Fuera del enlace: los clics dentro de la hoja burbujean por el árbol de
  // React hasta él y navegarían al detalle.
  const tarjeta = href ? (
    <IonRouterLink
      routerLink={href}
      onClick={() => recordarTarjeta(visible)}
      className={`${clases} tarjeta--enlace`}
      data-testid="tarjeta-partido"
      data-partido={partido.id}
      data-fecha={partido.fecha}
    >
      {contenido}
    </IonRouterLink>
  ) : (
    <article
      className={clases}
      data-testid="tarjeta-partido"
      data-partido={partido.id}
      data-fecha={partido.fecha}
    >
      {contenido}
    </article>
  );

  return (
    <>
      {tarjeta}
      {hoja && jornadaDe && partido.jornada && (
        <HojaJornada
          alCerrar={() => setHoja(false)}
          jornada={partido.jornada}
          partidos={jornadaDe(partido)}
          actualId={partido.id}
          rutaPartido={rutas.partido}
        />
      )}
    </>
  );
}

function LadoSkeleton() {
  return (
    <div className="tarjeta__lado">
      <Skeleton ancho={44} alto={44} redondo />
      <Skeleton ancho={72} alto={12} />
    </div>
  );
}

/** Misma estructura y alturas que la tarjeta real para que la carga no salte. */
export function TarjetaPartidoSkeleton() {
  return (
    <div className="tarjeta tarjeta--skeleton" data-testid="tarjeta-skeleton">
      <header className="tarjeta__cabecera">
        <Skeleton ancho={90} alto={12} />
        <Skeleton ancho={64} alto={20} style={{ borderRadius: 10 }} />
      </header>
      <div className="tarjeta__cruce">
        <LadoSkeleton />
        <div className="tarjeta__centro">
          <Skeleton ancho={48} alto={26} />
        </div>
        <LadoSkeleton />
      </div>
    </div>
  );
}
