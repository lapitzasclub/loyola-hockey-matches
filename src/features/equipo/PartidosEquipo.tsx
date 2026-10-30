import { IonSegment, IonSegmentButton } from '@ionic/react';
import { calendarOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { agruparPorMes, partidoVisible } from '../../domain';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { formatoMes } from '../../ui/formato';
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
      <IonSegment
        className="segmento segmento--filtro"
        value={filtro}
        onIonChange={(e) => setFiltro(e.detail.value as Filtro)}
      >
        {(['todos', 'jugados', 'pendientes'] as const).map((f) => (
          <IonSegmentButton key={f} value={f} data-testid={`filtro-${f}`}>
            {t(`equipo.filtros.${f}`)}
          </IonSegmentButton>
        ))}
      </IonSegment>
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
                  visible={partidoVisible(p, datos.hoy)}
                  propio={datos.equipo}
                  href={rutas.partido(p.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
