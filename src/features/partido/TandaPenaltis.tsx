import { useTranslation } from 'react-i18next';

import { personaVisible, tandaDePenaltis } from '../../domain';
import type {
  IndiceAlineacion,
  Lanzamiento,
  PartidoDetalle,
} from '../../domain';
import { PersonaEnlace } from './PersonaEnlace';

const SIMBOLO = { gol: '✓', fallo: '✗', pendiente: '·' } as const;

function Lanzador({
  lanzamiento,
  indice,
}: {
  lanzamiento: Lanzamiento | null;
  indice: IndiceAlineacion;
}) {
  const { t } = useTranslation();
  if (!lanzamiento) return <span className="tanda__lanzamiento" />;
  const persona = personaVisible(lanzamiento.lanzador, indice);
  return (
    <span
      className={`tanda__lanzamiento tanda__lanzamiento--${lanzamiento.resultado}`}
      data-resultado={lanzamiento.resultado}
    >
      <span className="tanda__nombre">
        {persona ? <PersonaEnlace persona={persona} /> : null}
      </span>
      <span
        className="tanda__resultado"
        role="img"
        aria-label={t(`partido.tanda.${lanzamiento.resultado}`)}
      >
        {SIMBOLO[lanzamiento.resultado]}
      </span>
    </span>
  );
}

/** Tanda de penaltis por rondas: un lanzamiento de cada equipo por fila. */
export function TandaPenaltis({
  partido,
  indice,
}: {
  partido: PartidoDetalle;
  indice: IndiceAlineacion;
}) {
  const { t } = useTranslation();
  const tanda = tandaDePenaltis(partido.incidencias);
  if (!tanda) return null;
  const { local, visitante } = partido;
  return (
    <section className="seccion" data-testid="tanda-penaltis">
      <h2 className="seccion__titulo">{t('partido.tanda.titulo')}</h2>
      <div className="tanda">
        <div className="tanda__cabecera">
          <span>{local.equipo.nombreAbrev}</span>
          <strong data-testid="tanda-marcador">
            {tanda.marcador.local}–{tanda.marcador.visitante}
          </strong>
          <span>{visitante.equipo.nombreAbrev}</span>
        </div>
        {tanda.rondas.map((ronda) => (
          <div
            key={ronda.numero}
            className="tanda__ronda"
            data-testid="tanda-ronda"
            aria-label={t('partido.tanda.ronda', { numero: ronda.numero })}
          >
            <Lanzador lanzamiento={ronda.local} indice={indice} />
            <span className="tanda__numero">{ronda.numero}</span>
            <Lanzador lanzamiento={ronda.visitante} indice={indice} />
          </div>
        ))}
      </div>
    </section>
  );
}
