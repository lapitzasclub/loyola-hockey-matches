import { useTranslation } from 'react-i18next';

import { rankingEquipos } from '../../domain';
import type { FilaClasificacion } from '../../domain';
import { Escudo } from '../../ui/Escudo';

/** Equipos que enseña cada ranking. */
export const TOP_EQUIPOS = 5;

function Seccion({
  titulo,
  filas,
  categoria,
}: {
  titulo: string;
  filas: readonly FilaClasificacion[];
  categoria: 'ataque' | 'defensa';
}) {
  const { t } = useTranslation();
  const ranking = rankingEquipos(filas, categoria, TOP_EQUIPOS);
  if (ranking.length === 0) return null;
  return (
    <section className="seccion">
      <h2 className="seccion__titulo">{titulo}</h2>
      {ranking.map(({ puesto, fila }) => (
        <div
          key={`${fila.grupo?.id ?? ''}${fila.equipo.inscripcionId ?? fila.equipo.nombre}`}
          className="persona"
          data-testid="ranking-equipo"
        >
          <span className="persona__puesto">{puesto}</span>
          <Escudo
            logoUrl={fila.equipo.logoUrl}
            nombre={fila.equipo.nombre}
            abreviatura={fila.equipo.nombreAbrev}
            tamano={32}
          />
          <span className="persona__textos">
            <span className="persona__nombre">{fila.equipo.nombre}</span>
            <span className="persona__meta">
              {t('estadisticas.partidos', { count: fila.pj })} ·{' '}
              {categoria === 'ataque'
                ? t('estadisticas.golesContra', { count: fila.gc })
                : t('estadisticas.golesFavor', { count: fila.gf })}
            </span>
          </span>
          <span className="persona__dato persona__dato--fuerte">
            {categoria === 'ataque' ? fila.gf : fila.gc}
          </span>
        </div>
      ))}
    </section>
  );
}

/** Mejores ataques y defensas de la fase, a partir de su clasificación. */
export function RankingEquipos({
  filas,
}: {
  filas: readonly FilaClasificacion[];
}) {
  const { t } = useTranslation();
  return (
    <div data-testid="ranking-equipos">
      <Seccion
        titulo={t('estadisticas.equipos.ataque')}
        filas={filas}
        categoria="ataque"
      />
      <Seccion
        titulo={t('estadisticas.equipos.defensa')}
        filas={filas}
        categoria="defensa"
      />
    </div>
  );
}
