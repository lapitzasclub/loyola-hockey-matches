import { IonButton } from '@ionic/react';
import { calendarOutline, shirtOutline } from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  agruparPorCategoria,
  agruparPorMes,
  buscarEquipo,
  claveEquipo,
  fechaLocal,
  indiceProximoPartido,
  partidoVisible,
  partidosDeEquipo,
} from '../../domain';
import type { EquipoCatalogo, MarcadorDirecto } from '../../domain';
import {
  claves,
  useCalendario,
  useCatalogo,
  useEquipoElegido,
  useMarcadores,
  useRefrescar,
} from '../../queries';
import {
  CabeceraEquipo,
  CabeceraEquipoSkeleton,
} from '../../ui/CabeceraEquipo';
import { EstadoError } from '../../ui/EstadoError';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { formatoMes } from '../../ui/formato';
import { Pagina } from '../../ui/Pagina';
import { useRutas } from '../../ui/rutas';
import { SelectorEquipo } from '../../ui/SelectorEquipo';
import {
  TarjetaPartido,
  TarjetaPartidoSkeleton,
} from '../../ui/TarjetaPartido';

const SKELETONS = 3;

function ListaSkeleton() {
  return (
    <div className="lista-partidos" data-testid="partidos-skeleton">
      {Array.from({ length: SKELETONS }, (_, i) => (
        <TarjetaPartidoSkeleton key={i} />
      ))}
    </div>
  );
}

/** Calendario del equipo elegido, por meses, con el próximo partido resaltado. */
function Calendario({ elegido }: { elegido: EquipoCatalogo }) {
  const { t, i18n } = useTranslation();
  const rutas = useRutas();
  const calendario = useCalendario(elegido.division);
  const hoy = fechaLocal(new Date());

  const partidos = useMemo(
    () =>
      calendario.data
        ? partidosDeEquipo(calendario.data.partidos, elegido.equipo)
        : [],
    [calendario.data, elegido.equipo],
  );
  const proximoId = partidos[indiceProximoPartido(partidos, hoy)]?.id;

  // Con partidos hoy se vuelve a pedir /marcadores mientras la pantalla está abierta.
  const hayPartidoHoy = partidos.some((p) => p.fecha === hoy);
  const marcadores = useMarcadores(hayPartidoHoy);
  const directos = useMemo(
    () =>
      new Map<string, MarcadorDirecto>(
        (marcadores.data ?? []).map((m) => [m.partidoId, m]),
      ),
    [marcadores.data],
  );

  // Una sola vez por equipo: no se mueve la lista bajo el dedo en cada refresco.
  const proximoRef = useRef<HTMLDivElement | null>(null);
  const centrado = useRef<string | null>(null);
  const clave = claveEquipo(elegido);
  useEffect(() => {
    if (!proximoId || centrado.current === clave) return;
    // Un fotograma después: al montarse, ion-content aún no tiene el scroll listo.
    const fotograma = requestAnimationFrame(() => {
      centrado.current = clave;
      proximoRef.current?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(fotograma);
  }, [clave, proximoId]);

  if (calendario.isPending) return <ListaSkeleton />;
  if (calendario.isError) {
    return (
      <EstadoError
        texto={t('partidos.error')}
        alReintentar={() => void calendario.refetch()}
      />
    );
  }
  if (partidos.length === 0) {
    return (
      <EstadoVacio
        testId="partidos-vacio"
        icono={calendarOutline}
        titulo={t('partidos.vacio')}
      />
    );
  }

  return (
    <div data-testid="partidos">
      {agruparPorMes(partidos).map(({ mes, partidos: delMes }) => (
        <section key={mes}>
          <h2 className="mes">{formatoMes(mes, i18n.language)}</h2>
          <div className="lista-partidos">
            {delMes.map((p) => {
              const esProximo = p.id === proximoId;
              return (
                <div key={p.id} ref={esProximo ? proximoRef : undefined}>
                  <TarjetaPartido
                    visible={partidoVisible(p, hoy, directos.get(p.id))}
                    propio={elegido.equipo}
                    proximo={esProximo}
                    href={rutas.partido(p.id)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PartidosPage() {
  const { t } = useTranslation();
  const catalogo = useCatalogo();
  const [clave, elegir] = useEquipoElegido();
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const grupos = useMemo(
    () => agruparPorCategoria(catalogo.data ?? []),
    [catalogo.data],
  );
  const elegido = buscarEquipo(catalogo.data ?? [], clave);

  const refrescar = useRefrescar(
    claves.catalogo(),
    claves.calendario(elegido?.division.id),
    claves.marcadores(),
  );

  const contenido = () => {
    if (catalogo.isPending) {
      return (
        <>
          <CabeceraEquipoSkeleton />
          <div style={{ height: 12 }} />
          <ListaSkeleton />
        </>
      );
    }
    if (catalogo.isError) {
      return (
        <EstadoError
          texto={t('partidos.error')}
          alReintentar={() => void catalogo.refetch()}
        />
      );
    }
    if (catalogo.data.length === 0) {
      return (
        <EstadoVacio
          testId="selector-vacio"
          icono={shirtOutline}
          titulo={t('selector.vacio')}
        />
      );
    }
    if (!elegido) {
      return (
        <EstadoVacio
          testId="sin-equipo"
          icono={shirtOutline}
          titulo={t('partidos.sinEquipoTitulo')}
          texto={t('partidos.sinEquipoTexto')}
          accion={
            <IonButton
              data-testid="elegir-equipo"
              onClick={() => setSelectorAbierto(true)}
            >
              {t('selector.elegir')}
            </IonButton>
          }
        />
      );
    }
    return (
      <>
        <CabeceraEquipo
          nombre={elegido.equipo.nombre}
          abreviatura={elegido.equipo.nombreAbrev}
          logoUrl={elegido.equipo.logoUrl}
          competicion={elegido.competicion.nombre}
          alCambiar={() => setSelectorAbierto(true)}
        />
        <Calendario key={claveEquipo(elegido)} elegido={elegido} />
      </>
    );
  };

  return (
    <Pagina
      titulo={t('tabs.partidos')}
      testId="page-partidos"
      alRefrescar={refrescar}
    >
      {contenido()}
      <div style={{ height: 24 }} />
      <SelectorEquipo
        abierto={selectorAbierto}
        alCerrar={() => setSelectorAbierto(false)}
        grupos={grupos}
        elegido={clave}
        alElegir={(nueva) => {
          elegir(nueva);
          setSelectorAbierto(false);
        }}
      />
    </Pagina>
  );
}
