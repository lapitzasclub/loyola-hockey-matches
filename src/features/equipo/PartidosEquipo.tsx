import { calendarOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { agruparPorMes, jornadaVisible, partidoVisible } from '../../domain';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { formatoMes } from '../../ui/formato';
import { Pastillas } from '../../ui/Pastillas';
import { TarjetaPartido } from '../../ui/TarjetaPartido';
import { useRutas } from '../../ui/rutas';
import type { DatosEquipo } from './tipos';

type Filtro = 'todos' | 'jugados' | 'pendientes';

/** Todos los partidos del equipo por meses, con filtro de jugados y pendientes. */
export function PartidosEquipo({ datos }: { datos: DatosEquipo }) {
  const { t, i18n } = useTranslation();
  const rutas = useRutas();
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const visibles = datos.partidos.filter(
    (p) =>
      filtro === 'todos' ||
      (filtro === 'jugados') === (p.estado === 'finalizado'),
  );

  return (
    <div data-testid="partidos-equipo">
      <Pastillas
        tipo="filtro"
        testId="filtros-equipo"
        etiqueta={t('equipo.filtrosAria')}
        opciones={(['todos', 'jugados', 'pendientes'] as const).map((f) => ({
          id: f,
          etiqueta: t(`equipo.filtros.${f}`),
        }))}
        valor={filtro}
        alCambiar={setFiltro}
        testIdOpcion={(f) => `filtro-${f}`}
      />
      {visibles.length === 0 ? (
        <EstadoVacio icono={calendarOutline} titulo={t('equipo.sinPartidos')} />
      ) : (
        agruparPorMes(visibles).map(({ mes, partidos }) => (
          <section key={mes}>
            <h2 className="mes">{formatoMes(mes, i18n.language)}</h2>
            <div className="lista-partidos">
              {partidos.map((p) => (
                <TarjetaPartido
                  key={p.id}
                  visible={partidoVisible(
                    p,
                    datos.hoy,
                    datos.directos.get(p.id),
                  )}
                  propio={datos.equipo}
                  href={rutas.partido(p.id)}
                  jornadaDe={(q) =>
                    jornadaVisible(
                      datos.calendario,
                      q,
                      datos.hoy,
                      datos.directos,
                    )
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
