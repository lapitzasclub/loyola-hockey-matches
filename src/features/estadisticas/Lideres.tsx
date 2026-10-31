import { IonRouterLink } from '@ionic/react';
import { useTranslation } from 'react-i18next';

import { lideres } from '../../domain';
import type { JugadorDivision } from '../../domain';
import { FotoPersona } from '../../ui/FotoPersona';
import { useRutas } from '../../ui/rutas';
import { textoValor } from './RankingJugadores';

/** Tarjetas con el primero de cada categoría; abren su ficha. */
export function Lideres({
  jugadores,
}: {
  jugadores: readonly JugadorDivision[];
}) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const primeros = lideres(jugadores);
  if (primeros.length === 0) return null;

  return (
    <section className="seccion" data-testid="lideres">
      <h2 className="seccion__titulo">{t('estadisticas.premios')}</h2>
      <div className="lideres">
        {primeros.map(({ categoria, jugador }) => (
          <IonRouterLink
            key={categoria}
            routerLink={rutas.jugador(jugador.plantillaEquipoId)}
            className="lider"
            data-testid="lider"
          >
            <span className="lider__interior">
              <span className="lider__etiqueta">
                {t(`estadisticas.lider.${categoria}`)}
              </span>
              <FotoPersona
                nombre={jugador.nombre}
                fotoUrl={jugador.fotoUrl}
                tamano={48}
              />
              <span className="lider__nombre">{jugador.nombre}</span>
              <span className="lider__equipo">{jugador.equipoNombre}</span>
              <span className="lider__valor">
                {textoValor(jugador, categoria)}
              </span>
            </span>
          </IonRouterLink>
        ))}
      </div>
    </section>
  );
}
