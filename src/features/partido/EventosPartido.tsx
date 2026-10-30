import { IonIcon } from '@ionic/react';
import {
  flagOutline,
  footballOutline,
  radioButtonOnOutline,
  swapHorizontalOutline,
  timerOutline,
} from 'ionicons/icons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { PERIODO_PENALTIS, cronologia, personaVisible } from '../../domain';
import type {
  FilaCronologia,
  Incidencia,
  IndiceAlineacion,
  PartidoDetalle,
  PersonaIncidencia,
} from '../../domain';
import { Escudo } from '../../ui/Escudo';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { formatoCrono } from '../../ui/formato';
import { etiquetaPeriodo } from './periodo';
import { PersonaEnlace } from './PersonaEnlace';
import { TandaPenaltis } from './TandaPenaltis';

function Persona({
  persona,
  indice,
}: {
  persona: PersonaIncidencia | null;
  indice: IndiceAlineacion;
}) {
  const visible = personaVisible(persona, indice);
  return visible ? <PersonaEnlace persona={visible} /> : null;
}

function Linea({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <span className="evento__sub">
      {etiqueta}: {children}
    </span>
  );
}

function Icono({ incidencia }: { incidencia: Incidencia }) {
  switch (incidencia.tipo) {
    case 'GOL':
      return <IonIcon icon={footballOutline} />;
    case 'FALTA':
    case 'FALTA-HL':
      return <IonIcon icon={flagOutline} />;
    case 'PENALTI':
    case 'FALTADIRECTA':
      return <IonIcon icon={radioButtonOnOutline} />;
    case 'TM':
      return <IonIcon icon={timerOutline} />;
    case 'CAMBIO':
      return <IonIcon icon={swapHorizontalOutline} />;
    case 'TARJETAAZUL':
      return <span className="tarjeta-color tarjeta-color--azul" />;
    case 'TARJETAAMARILLA':
      return <span className="tarjeta-color tarjeta-color--amarilla" />;
    case 'TARJETAROJA':
      return <span className="tarjeta-color tarjeta-color--roja" />;
    case 'PARADA':
      return null;
  }
}

function Titulo({ children }: { children: ReactNode }) {
  return <strong className="evento__titulo">{children}</strong>;
}

function Texto({
  incidencia,
  indice,
}: {
  incidencia: Incidencia;
  indice: IndiceAlineacion;
}) {
  const { t } = useTranslation();
  switch (incidencia.tipo) {
    case 'GOL': {
      const titulo =
        incidencia.via === 'penalti'
          ? t('partido.eventos.golPenalti')
          : incidencia.via === 'falta-directa'
            ? t('partido.eventos.golFaltaDirecta')
            : t('partido.eventos.gol');
      return (
        <>
          <Titulo>{titulo}</Titulo>
          <Persona persona={incidencia.autor} indice={indice} />
          {incidencia.asistente && (
            <Linea etiqueta={t('partido.eventos.asiste')}>
              <Persona persona={incidencia.asistente} indice={indice} />
            </Linea>
          )}
        </>
      );
    }
    case 'FALTA':
    case 'FALTA-HL':
      return (
        <>
          <Titulo>{t('partido.eventos.falta')}</Titulo>
          <Persona persona={incidencia.jugador} indice={indice} />
        </>
      );
    case 'PENALTI':
    case 'FALTADIRECTA': {
      const fallado = incidencia.resultado === 'fallo';
      const clave =
        incidencia.tipo === 'PENALTI'
          ? fallado
            ? 'penaltiFallado'
            : 'penalti'
          : fallado
            ? 'faltaDirectaFallada'
            : 'faltaDirecta';
      return (
        <>
          <Titulo>{t(`partido.eventos.${clave}`)}</Titulo>
          <Persona persona={incidencia.lanzador} indice={indice} />
          {incidencia.portero && (
            <Linea etiqueta={t('partido.eventos.portero')}>
              <Persona persona={incidencia.portero} indice={indice} />
            </Linea>
          )}
        </>
      );
    }
    case 'TM':
      return <Titulo>{t('partido.eventos.tiempoMuerto')}</Titulo>;
    case 'CAMBIO':
      return (
        <>
          <Titulo>{t('partido.eventos.cambio')}</Titulo>
          {incidencia.entra && (
            <Linea etiqueta={t('partido.eventos.entra')}>
              <Persona persona={incidencia.entra} indice={indice} />
            </Linea>
          )}
          {incidencia.sale && (
            <Linea etiqueta={t('partido.eventos.sale')}>
              <Persona persona={incidencia.sale} indice={indice} />
            </Linea>
          )}
        </>
      );
    case 'TARJETAAZUL':
    case 'TARJETAAMARILLA':
    case 'TARJETAROJA': {
      const clave = {
        TARJETAAZUL: 'tarjetaAzul',
        TARJETAAMARILLA: 'tarjetaAmarilla',
        TARJETAROJA: 'tarjetaRoja',
      }[incidencia.tipo];
      return (
        <>
          <Titulo>{t(`partido.eventos.${clave}`)}</Titulo>
          <Persona persona={incidencia.persona} indice={indice} />
          {incidencia.sancionSegundos !== null && (
            <span className="evento__sub">
              {t('partido.eventos.sancion', {
                minutos: Math.round(incidencia.sancionSegundos / 60),
              })}
            </span>
          )}
        </>
      );
    }
    case 'PARADA':
      return null;
  }
}

function Fila({
  fila,
  partido,
  indice,
}: {
  fila: FilaCronologia;
  partido: PartidoDetalle;
  indice: IndiceAlineacion;
}) {
  const { t } = useTranslation();
  const { incidencia, marcador } = fila;
  const equipo = partido[incidencia.lado].equipo;
  return (
    <li
      className="evento"
      data-testid="evento"
      data-tipo={incidencia.tipo}
      data-lado={incidencia.lado}
    >
      <span className="evento__reloj">
        {formatoCrono(incidencia.minuto, incidencia.segundo)}
      </span>
      <span className="evento__icono" aria-hidden>
        <Icono incidencia={incidencia} />
      </span>
      <span className="evento__texto">
        <Texto incidencia={incidencia} indice={indice} />
      </span>
      {marcador && (
        <span
          className="evento__marcador"
          aria-label={t('partido.eventos.marcador', {
            resultado: `${marcador.local}-${marcador.visitante}`,
          })}
        >
          {marcador.local}–{marcador.visitante}
        </span>
      )}
      <Escudo
        logoUrl={equipo.logoUrl}
        nombre={equipo.nombre}
        abreviatura={equipo.nombreAbrev}
        tamano={24}
      />
    </li>
  );
}

/**
 * Línea de eventos: la tanda de penaltis (si la hubo) y los periodos del más
 * reciente al más antiguo, cada uno con sus incidencias en el mismo sentido.
 * Solo lee `incidencias`, así que el directo se pinta sin tocar la vista.
 */
export function EventosPartido({
  partido,
  indice,
}: {
  partido: PartidoDetalle;
  indice: IndiceAlineacion;
}) {
  const { t } = useTranslation();
  const grupos = cronologia(partido.incidencias).reverse();
  const hayTanda = partido.incidencias.some(
    (i) => i.periodo === PERIODO_PENALTIS,
  );

  if (grupos.length === 0 && !hayTanda) {
    return (
      <EstadoVacio
        testId="eventos-vacios"
        icono={timerOutline}
        titulo={t('partido.eventos.vacios')}
      />
    );
  }

  return (
    <div data-testid="eventos-partido">
      {hayTanda && <TandaPenaltis partido={partido} indice={indice} />}
      {grupos.map((grupo) => (
        <section
          key={grupo.periodo}
          className="seccion"
          data-periodo={grupo.periodo}
        >
          <h2 className="seccion__titulo">
            {etiquetaPeriodo(t, grupo.periodo)}
          </h2>
          <ol className="eventos">
            {[...grupo.filas].reverse().map((fila) => (
              <Fila
                key={fila.incidencia.id}
                fila={fila}
                partido={partido}
                indice={indice}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
