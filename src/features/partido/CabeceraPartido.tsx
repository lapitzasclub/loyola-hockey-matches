import { useTranslation } from 'react-i18next';

import { resultadoPartido } from '../../domain';
import type { LadoDetalle, Marcador, PartidoDetalle } from '../../domain';
import { Escudo } from '../../ui/Escudo';
import { formatoDia } from '../../ui/formato';
import { InsigniaEstado } from '../../ui/InsigniaEstado';
import { Skeleton } from '../../ui/Skeleton';
import { etiquetaPeriodo } from './periodo';

const resultado = (m: Marcador) => `${m.local}–${m.visitante}`;

function Equipo({ lado }: { lado: LadoDetalle }) {
  return (
    <div className="partido-cabecera__equipo">
      <Escudo
        logoUrl={lado.equipo.logoUrl}
        nombre={lado.equipo.nombre}
        abreviatura={lado.equipo.nombreAbrev}
        tamano={56}
      />
      <span className="partido-cabecera__nombre">{lado.equipo.nombre}</span>
    </div>
  );
}

function Centro({ partido }: { partido: PartidoDetalle }) {
  const { t } = useTranslation();
  const datos = resultadoPartido(partido);
  const oficial =
    datos &&
    (datos.oficial.local !== datos.goles.local ||
      datos.oficial.visitante !== datos.goles.visitante)
      ? datos.oficial
      : null;
  return (
    <div className="partido-cabecera__centro">
      <InsigniaEstado estado={partido.estado} />
      {partido.estado === 'en_juego' && (
        <span className="partido-cabecera__periodo" data-testid="periodo">
          {etiquetaPeriodo(t, partido.periodo)}
        </span>
      )}
      {datos ? (
        <span className="partido-cabecera__marcador" data-testid="marcador">
          {resultado(datos.goles)}
        </span>
      ) : (
        <span className="partido-cabecera__marcador partido-cabecera__marcador--hora">
          {partido.hora ?? '--:--'}
        </span>
      )}
      {oficial && (
        <span
          className="partido-cabecera__oficial"
          data-testid="marcador-oficial"
        >
          {t('partidos.oficial', { resultado: resultado(oficial) })}
        </span>
      )}
      {datos?.tanda && (
        <span
          className="partido-cabecera__oficial"
          data-testid="marcador-tanda"
        >
          {t('partido.tanda.titulo')} {resultado(datos.tanda.marcador)}
        </span>
      )}
    </div>
  );
}

/**
 * Cabecera con escudos, marcador y estado. Dos zonas: `__meta` (competición y
 * fecha), que es lo que S09 plegará con el scroll, y `__cruce`, que se queda.
 */
export function CabeceraPartido({ partido }: { partido: PartidoDetalle }) {
  const { t, i18n } = useTranslation();
  return (
    <header className="partido-cabecera" data-testid="partido-cabecera">
      <div className="partido-cabecera__meta" data-plegable>
        <span>
          {partido.jornada
            ? t('partido.jornada', {
                competicion: partido.competicionNombre,
                jornada: partido.jornada,
              })
            : partido.competicionNombre}
        </span>
        <span>
          {[formatoDia(partido.fecha, i18n.language), partido.hora]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <div className="partido-cabecera__cruce">
        <Equipo lado={partido.local} />
        <Centro partido={partido} />
        <Equipo lado={partido.visitante} />
      </div>
    </header>
  );
}

export function CabeceraPartidoSkeleton() {
  return (
    <div
      className="partido-cabecera"
      data-testid="partido-cabecera-skeleton"
      aria-hidden
    >
      <div className="partido-cabecera__meta">
        <Skeleton ancho={120} alto={12} />
        <Skeleton ancho={90} alto={12} />
      </div>
      <div className="partido-cabecera__cruce">
        <div className="partido-cabecera__equipo">
          <Skeleton ancho={56} alto={56} redondo />
          <Skeleton ancho={72} alto={12} />
        </div>
        <div className="partido-cabecera__centro">
          <Skeleton ancho={64} alto={30} />
        </div>
        <div className="partido-cabecera__equipo">
          <Skeleton ancho={56} alto={56} redondo />
          <Skeleton ancho={72} alto={12} />
        </div>
      </div>
    </div>
  );
}
