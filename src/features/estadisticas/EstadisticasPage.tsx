import { IonButton } from '@ionic/react';
import { shirtOutline, statsChartOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CATEGORIAS_RANKING,
  claveEquipo,
  faseInicial,
  rankingJugadores,
} from '../../domain';
import type { CategoriaRanking, EquipoCatalogo } from '../../domain';
import {
  claves,
  useClasificacion,
  useEstadisticasJugadores,
  useFases,
  useRefrescar,
  useSeleccionEquipo,
} from '../../queries';
import { EstadoError } from '../../ui/EstadoError';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { Pagina } from '../../ui/Pagina';
import { Pastillas } from '../../ui/Pastillas';
import { Revelado, useEspera } from '../../ui/Revelado';
import { useShell } from '../../ui/shell';
import { Skeleton } from '../../ui/Skeleton';
import { Lideres } from './Lideres';
import { RankingEquipos } from './RankingEquipos';
import { RankingJugadores } from './RankingJugadores';

type Categoria = CategoriaRanking | 'equipos';
const CATEGORIAS: readonly Categoria[] = [...CATEGORIAS_RANKING, 'equipos'];

function RankingsSkeleton() {
  return (
    <div data-testid="estadisticas-skeleton">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="persona">
          <Skeleton ancho={36} alto={36} redondo />
          <Skeleton ancho="50%" alto={14} />
        </div>
      ))}
    </div>
  );
}

function SinDatos() {
  const { t } = useTranslation();
  return (
    <EstadoVacio
      testId="estadisticas-vacias"
      icono={statsChartOutline}
      titulo={t('estadisticas.vacia')}
    />
  );
}

/** Rankings de la división del equipo elegido. */
function Rankings({ elegido }: { elegido: EquipoCatalogo }) {
  const { t } = useTranslation();
  const [categoria, setCategoria] = useState<Categoria>('goles');
  const estadisticas = useEstadisticasJugadores(elegido.division.id);
  // Ataques y defensas salen de la tabla de la fase, como en la clasificación.
  const fases = useFases(elegido.division.id);
  const fase = fases.data ? faseInicial(fases.data) : null;
  const clasificacion = useClasificacion(fase?.id);

  const espera = useEspera(estadisticas.isPending);
  if (estadisticas.isPending) return <RankingsSkeleton />;
  if (estadisticas.isError) {
    return (
      <EstadoError
        texto={t('estadisticas.error')}
        alReintentar={() => void estadisticas.refetch()}
      />
    );
  }

  const jugadores = estadisticas.data;
  const filasEquipos = (clasificacion.data ?? []).filter(
    (f) => f.faseId === fase?.id,
  );
  const hayJugadores = CATEGORIAS_RANKING.some(
    (c) => rankingJugadores(jugadores, c, 1).length > 0,
  );
  if (!hayJugadores && filasEquipos.length === 0) return <SinDatos />;

  const panel = () => {
    if (categoria === 'equipos') {
      if (filasEquipos.length > 0)
        return <RankingEquipos filas={filasEquipos} />;
      return clasificacion.isPending && fase ? (
        <RankingsSkeleton />
      ) : (
        <SinDatos />
      );
    }
    return rankingJugadores(jugadores, categoria, 1).length > 0 ? (
      <RankingJugadores jugadores={jugadores} categoria={categoria} />
    ) : (
      <SinDatos />
    );
  };

  return (
    <Revelado espera={espera} saliente={<RankingsSkeleton />}>
      <Lideres jugadores={jugadores} />
      <Pastillas
        testId="categorias"
        etiqueta={t('estadisticas.categoriasAria')}
        opciones={CATEGORIAS.map((c) => ({
          id: c,
          etiqueta: t(`estadisticas.categorias.${c}`),
        }))}
        valor={categoria}
        alCambiar={setCategoria}
        testIdOpcion={(c) => `categoria-${c}`}
      />
      {panel()}
    </Revelado>
  );
}

export function EstadisticasPage() {
  const { t } = useTranslation();
  const { catalogo, elegido } = useSeleccionEquipo();
  const { abrirSelector } = useShell();

  const refrescar = useRefrescar(
    claves.catalogo(),
    claves.division(elegido?.division.id),
    claves.clasificaciones(),
  );

  const contenido = () => {
    if (catalogo.isPending) {
      return <RankingsSkeleton />;
    }
    if (catalogo.isError) {
      return (
        <EstadoError
          texto={t('estadisticas.error')}
          alReintentar={() => void catalogo.refetch()}
        />
      );
    }
    if (!elegido) {
      return (
        <EstadoVacio
          testId="sin-equipo"
          icono={shirtOutline}
          titulo={t('partidos.sinEquipoTitulo')}
          texto={t('estadisticas.sinEquipoTexto')}
          accion={
            <IonButton data-testid="elegir-equipo" onClick={abrirSelector}>
              {t('selector.elegir')}
            </IonButton>
          }
        />
      );
    }
    return <Rankings key={claveEquipo(elegido)} elegido={elegido} />;
  };

  return (
    <Pagina
      titulo={t('tabs.estadisticas')}
      testId="page-estadisticas"
      alRefrescar={refrescar}
    >
      {contenido()}
      <div style={{ height: 24 }} />
    </Pagina>
  );
}
