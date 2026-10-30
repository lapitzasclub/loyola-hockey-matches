import { IonRouterLink } from '@ionic/react';
import { useTranslation } from 'react-i18next';

import { rankingJugadores, valorRanking } from '../../domain';
import type { CategoriaRanking, JugadorDivision } from '../../domain';
import { Escudo } from '../../ui/Escudo';
import { FotoPersona } from '../../ui/FotoPersona';
import { useRutas } from '../../ui/rutas';

/** Jugadores que enseña cada ranking. */
export const TOP_JUGADORES = 10;

/** Valor destacado de la fila: los porteros, en porcentaje. */
export function textoValor(
  jugador: JugadorDivision,
  categoria: CategoriaRanking,
) {
  const valor = valorRanking(jugador, categoria);
  return categoria === 'porteros' ? `${Math.round(valor)}%` : String(valor);
}

interface Props {
  jugadores: readonly JugadorDivision[];
  categoria: CategoriaRanking;
}

/** Los diez primeros de una categoría; cada fila abre la ficha del jugador. */
export function RankingJugadores({ jugadores, categoria }: Props) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const ranking = rankingJugadores(jugadores, categoria, TOP_JUGADORES);

  return (
    <section
      className="seccion"
      aria-label={t('estadisticas.ranking', {
        categoria: t(`estadisticas.categorias.${categoria}`),
      })}
      data-testid="ranking-jugadores"
    >
      {ranking.map(({ puesto, jugador }) => (
        <IonRouterLink
          key={jugador.plantillaEquipoId}
          routerLink={rutas.jugador(jugador.plantillaEquipoId)}
          className="persona persona--enlace"
          data-testid="ranking-fila"
        >
          <span className="persona__interior">
            <span className="persona__puesto">{puesto}</span>
            <FotoPersona nombre={jugador.nombre} fotoUrl={jugador.fotoUrl} />
            <span className="persona__textos">
              <span className="persona__nombre">{jugador.nombre}</span>
              <span className="persona__meta">
                <Escudo
                  logoUrl={jugador.logoUrl}
                  nombre={jugador.equipoNombre}
                  tamano={14}
                />
                {jugador.equipoNombre} ·{' '}
                {t('estadisticas.partidos', { count: jugador.partidosJugados })}
              </span>
            </span>
            <span className="persona__dato persona__dato--fuerte">
              {textoValor(jugador, categoria)}
            </span>
          </span>
        </IonRouterLink>
      ))}
    </section>
  );
}
