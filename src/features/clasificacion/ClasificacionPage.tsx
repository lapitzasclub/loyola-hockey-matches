import { IonButton, IonSegment, IonSegmentButton } from '@ionic/react';
import { listOutline, shirtOutline } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  agruparClasificacion,
  claveEquipo,
  faseInicial,
  rachasDeTabla,
} from '../../domain';
import type { EquipoCatalogo } from '../../domain';
import {
  claves,
  useCalendario,
  useClasificacion,
  useFases,
  useRefrescar,
  useSeleccionEquipo,
} from '../../queries';
import {
  CabeceraEquipo,
  CabeceraEquipoSkeleton,
} from '../../ui/CabeceraEquipo';
import { EstadoError } from '../../ui/EstadoError';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { Pagina } from '../../ui/Pagina';
import { Revelado, useEspera } from '../../ui/Revelado';
import { SelectorEquipo } from '../../ui/SelectorEquipo';
import {
  TablaClasificacionGrupo,
  TablaClasificacionSkeleton,
} from './TablaClasificacion';

/** Tablas de la fase elegida (por defecto la primera de liga) de la división. */
function Tablas({ elegido }: { elegido: EquipoCatalogo }) {
  const { t } = useTranslation();
  const { id: divisionId, competicionId } = elegido.division;
  const fases = useFases(divisionId);
  const [faseElegida, setFaseElegida] = useState<string | null>(null);
  const fase =
    fases.data?.find((f) => f.id === faseElegida) ??
    (fases.data ? faseInicial(fases.data) : null);

  const clasificacion = useClasificacion(fase?.id);
  // La racha se calcula con los partidos; si aún no han llegado vale la de la federación.
  const calendario = useCalendario(elegido.division);

  const tablas = useMemo(
    () =>
      fase && clasificacion.data
        ? agruparClasificacion(fase, clasificacion.data)
        : [],
    [fase, clasificacion.data],
  );

  const espera = useEspera(fases.isPending || clasificacion.isPending);
  if (fases.isPending) return <TablaClasificacionSkeleton />;
  if (fases.isError) {
    return (
      <EstadoError
        texto={t('clasificacion.error')}
        alReintentar={() => void fases.refetch()}
      />
    );
  }
  if (!fase) {
    return (
      <EstadoVacio
        testId="clasificacion-vacia"
        icono={listOutline}
        titulo={t('clasificacion.vacia')}
      />
    );
  }

  return (
    <>
      {fases.data.length > 1 && (
        <IonSegment
          className="segmento"
          scrollable
          value={fase.id}
          onIonChange={(e) => setFaseElegida(String(e.detail.value))}
          data-testid="fases"
        >
          {fases.data.map((f) => (
            <IonSegmentButton key={f.id} value={f.id} data-testid="fase">
              {f.nombre}
            </IonSegmentButton>
          ))}
        </IonSegment>
      )}
      {clasificacion.isPending ? (
        <TablaClasificacionSkeleton />
      ) : clasificacion.isError ? (
        <EstadoError
          texto={t('clasificacion.error')}
          alReintentar={() => void clasificacion.refetch()}
        />
      ) : tablas.length === 0 ? (
        <EstadoVacio
          testId="clasificacion-vacia"
          icono={listOutline}
          titulo={t('clasificacion.vacia')}
          texto={
            fase.formato === 'eliminatoria'
              ? t('clasificacion.eliminatoria')
              : undefined
          }
        />
      ) : (
        <Revelado espera={espera} saliente={<TablaClasificacionSkeleton />}>
          {tablas.map((tabla) => (
            <TablaClasificacionGrupo
              key={tabla.grupo?.id ?? 'unica'}
              tabla={tabla}
              competicionId={competicionId}
              divisionId={divisionId}
              rachas={
                calendario.data
                  ? rachasDeTabla(tabla, calendario.data.partidos)
                  : undefined
              }
            />
          ))}
        </Revelado>
      )}
    </>
  );
}

export function ClasificacionPage() {
  const { t } = useTranslation();
  const { catalogo, clave, elegir, grupos, elegido } = useSeleccionEquipo();
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const refrescar = useRefrescar(
    claves.catalogo(),
    claves.division(elegido?.division.id),
    claves.clasificaciones(),
  );

  const contenido = () => {
    if (catalogo.isPending) {
      return (
        <>
          <CabeceraEquipoSkeleton />
          <TablaClasificacionSkeleton />
        </>
      );
    }
    if (catalogo.isError) {
      return (
        <EstadoError
          texto={t('clasificacion.error')}
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
          texto={t('clasificacion.sinEquipoTexto')}
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
        <Tablas key={claveEquipo(elegido)} elegido={elegido} />
      </>
    );
  };

  return (
    <Pagina
      titulo={t('tabs.clasificacion')}
      testId="page-clasificacion"
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
