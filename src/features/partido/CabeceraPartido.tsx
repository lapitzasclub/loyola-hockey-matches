import { useTranslation } from 'react-i18next';

import { resultadoPartido } from '../../domain';
import type {
  Equipo as EquipoDominio,
  EstadoVisible,
  Marcador,
  PartidoDetalle,
  PartidoVisible,
} from '../../domain';
import { Escudo } from '../../ui/Escudo';
import { formatoDia } from '../../ui/formato';
import { InsigniaEstado } from '../../ui/InsigniaEstado';
import { Skeleton } from '../../ui/Skeleton';
import { transicion } from '../../ui/transiciones';
import { etiquetaPeriodo } from './periodo';

const resultado = (m: Marcador) => `${m.local}–${m.visitante}`;

/** Lo que pinta la cabecera, venga del acta o de la tarjeta pulsada. */
interface DatosCabecera {
  id: string;
  /** null en la previa: la tarjeta no trae el nombre de la competición. */
  competicion: string | null;
  jornada: string | null;
  fecha: string;
  hora: string | null;
  estado: EstadoVisible;
  periodo: number | null;
  local: EquipoDominio;
  visitante: EquipoDominio;
  goles: Marcador | null;
  oficial: Marcador | null;
  tanda: Marcador | null;
}

function deDetalle(partido: PartidoDetalle): DatosCabecera {
  const datos = resultadoPartido(partido);
  const oficial =
    datos &&
    (datos.oficial.local !== datos.goles.local ||
      datos.oficial.visitante !== datos.goles.visitante)
      ? datos.oficial
      : null;
  return {
    id: partido.id,
    competicion: partido.competicionNombre,
    jornada: partido.jornada,
    fecha: partido.fecha,
    hora: partido.hora,
    estado: partido.estado,
    periodo: partido.periodo,
    local: partido.local.equipo,
    visitante: partido.visitante.equipo,
    goles: datos?.goles ?? null,
    oficial,
    tanda: datos?.tanda?.marcador ?? null,
  };
}

function Equipo({
  equipo,
  partidoId,
  lado,
}: {
  equipo: EquipoDominio;
  partidoId: string;
  lado: 'local' | 'visitante';
}) {
  return (
    <div className="partido-cabecera__equipo">
      <Escudo
        logoUrl={equipo.logoUrl}
        nombre={equipo.nombre}
        abreviatura={equipo.nombreAbrev}
        tamano={56}
        transicion={transicion.escudoPartido(partidoId, lado)}
      />
      <span
        className="partido-cabecera__nombre"
        data-transicion={transicion.nombrePartido(partidoId, lado)}
      >
        {equipo.nombre}
      </span>
    </div>
  );
}

function Centro({ datos }: { datos: DatosCabecera }) {
  const { t } = useTranslation();
  return (
    <div className="partido-cabecera__centro">
      <InsigniaEstado estado={datos.estado} />
      {datos.estado === 'en_juego' && datos.periodo !== null && (
        <span className="partido-cabecera__periodo" data-testid="periodo">
          {etiquetaPeriodo(t, datos.periodo)}
        </span>
      )}
      {datos.goles ? (
        <span
          className="partido-cabecera__marcador"
          data-testid="marcador"
          data-transicion={transicion.marcador(datos.id)}
        >
          {resultado(datos.goles)}
        </span>
      ) : (
        <span
          className="partido-cabecera__marcador partido-cabecera__marcador--hora"
          data-transicion={transicion.marcador(datos.id)}
        >
          {datos.hora ?? '--:--'}
        </span>
      )}
      {datos.oficial && (
        <span
          className="partido-cabecera__oficial"
          data-testid="marcador-oficial"
        >
          {t('partidos.oficial', { resultado: resultado(datos.oficial) })}
        </span>
      )}
      {datos.tanda && (
        <span
          className="partido-cabecera__oficial"
          data-testid="marcador-tanda"
        >
          {t('partido.tanda.titulo')} {resultado(datos.tanda)}
        </span>
      )}
    </div>
  );
}

function Cabecera({ datos, testId }: { datos: DatosCabecera; testId: string }) {
  const { t, i18n } = useTranslation();
  return (
    <header className="partido-cabecera" data-testid={testId}>
      <div className="partido-cabecera__meta" data-plegable>
        <span>
          {datos.competicion &&
            (datos.jornada
              ? t('partido.jornada', {
                  competicion: datos.competicion,
                  jornada: datos.jornada,
                })
              : datos.competicion)}
        </span>
        <span>
          {[formatoDia(datos.fecha, i18n.language), datos.hora]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <div className="partido-cabecera__cruce">
        <Equipo equipo={datos.local} partidoId={datos.id} lado="local" />
        <Centro datos={datos} />
        <Equipo
          equipo={datos.visitante}
          partidoId={datos.id}
          lado="visitante"
        />
      </div>
    </header>
  );
}

/**
 * Cabecera con escudos, marcador y estado. Dos zonas: `__meta` (competición y
 * fecha), que se pliega con el scroll, y `__cruce`, que se queda.
 */
export function CabeceraPartido({ partido }: { partido: PartidoDetalle }) {
  return <Cabecera datos={deDetalle(partido)} testId="partido-cabecera" />;
}

/**
 * La misma cabecera con lo que ya enseñaba la tarjeta pulsada, mientras llega
 * el acta: así la página entra completa y el vuelo de escudos y marcador
 * tiene destino. Sin rival conocido no hay previa.
 */
export function CabeceraPartidoPrevia({
  visible,
}: {
  visible: PartidoVisible;
}) {
  const { partido } = visible;
  if (!partido.local || !partido.visitante) return <CabeceraPartidoSkeleton />;
  return (
    <Cabecera
      testId="partido-cabecera-previa"
      datos={{
        id: partido.id,
        competicion: null,
        jornada: partido.jornada,
        fecha: partido.fecha,
        hora: partido.hora,
        estado: visible.estado,
        periodo: null,
        local: partido.local,
        visitante: partido.visitante,
        goles: visible.marcador,
        oficial: visible.oficial,
        tanda: null,
      }}
    />
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

/**
 * Lo esencial del cruce (escudos y marcador u hora) para la barra, cuando la
 * cabecera se ha plegado al bajar. Sin nombres de transición: no vuela.
 */
export function CabeceraPartidoCompacta({
  partido,
}: {
  partido: PartidoDetalle;
}) {
  const datos = deDetalle(partido);
  return (
    <>
      <Escudo
        logoUrl={datos.local.logoUrl}
        nombre={datos.local.nombre}
        abreviatura={datos.local.nombreAbrev}
        tamano={22}
      />
      <span className="pagina__compacta-marcador">
        {datos.goles ? resultado(datos.goles) : (datos.hora ?? '--:--')}
      </span>
      <Escudo
        logoUrl={datos.visitante.logoUrl}
        nombre={datos.visitante.nombre}
        abreviatura={datos.visitante.nombreAbrev}
        tamano={22}
      />
    </>
  );
}
