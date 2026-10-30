import { IonSegment, IonSegmentButton } from '@ionic/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import {
  agruparClasificacion,
  completarEquipo,
  equipoDeCalendario,
  faseDelEquipo,
  fechaLocal,
  filaDeEquipo,
  partidosDeEquipo,
  rachasDeTabla,
} from '../../domain';
import {
  claves,
  useCalendario,
  useCatalogo,
  useClasificacion,
  useEquiposDivision,
  useFases,
  useRefrescar,
} from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Escudo } from '../../ui/Escudo';
import { Pagina } from '../../ui/Pagina';
import type { ParamsEquipo } from '../../ui/rutas';
import { Skeleton } from '../../ui/Skeleton';
import { transicion } from '../../ui/transiciones';
import { AlineacionesEquipo } from './AlineacionesEquipo';
import { EstadisticasEquipo } from './EstadisticasEquipo';
import { PartidosEquipo } from './PartidosEquipo';
import { PlantillaEquipo } from './PlantillaEquipo';
import { ResumenEquipo } from './ResumenEquipo';
import type { DatosEquipo } from './tipos';

const SECCIONES = [
  'resumen',
  'partidos',
  'plantilla',
  'estadisticas',
  'alineaciones',
] as const;
type Seccion = (typeof SECCIONES)[number];

function CabeceraSkeleton() {
  return (
    <div className="equipo-cabecera" data-testid="equipo-skeleton">
      <Skeleton ancho={64} alto={64} redondo />
      <Skeleton ancho={160} alto={18} />
    </div>
  );
}

/** Resumen con la tabla de la fase en la que está el equipo. */
function ResumenConTabla({ datos }: { datos: DatosEquipo }) {
  const fases = useFases(datos.divisionId);
  const fase = useMemo(
    () =>
      fases.data
        ? faseDelEquipo(
            fases.data,
            datos.partidos,
            datos.inscripcionId,
            datos.hoy,
          )
        : null,
    [fases.data, datos.partidos, datos.inscripcionId, datos.hoy],
  );
  const clasificacion = useClasificacion(fase?.id);
  const tabla = useMemo(() => {
    if (!fase || !clasificacion.data) return null;
    const tablas = agruparClasificacion(fase, clasificacion.data);
    const fila = filaDeEquipo(tablas, datos.inscripcionId);
    const suya = tablas.find((t) => fila && t.filas.includes(fila));
    return fila && suya ? { fila, tabla: suya } : null;
  }, [fase, clasificacion.data, datos.inscripcionId]);

  const racha = tabla
    ? rachasDeTabla(tabla.tabla, datos.partidos).get(datos.inscripcionId)
    : undefined;

  return (
    <ResumenEquipo datos={datos} fila={tabla?.fila ?? null} racha={racha} />
  );
}

/** Detalle de un equipo: resumen, partidos, plantilla, estadísticas y alineaciones. */
export function EquipoPage() {
  const { t } = useTranslation();
  const { competicionId, divisionId, inscripcionId } =
    useParams<keyof ParamsEquipo>();
  const [seccion, setSeccion] = useState<Seccion>('resumen');

  const division =
    competicionId && divisionId ? { id: divisionId, competicionId } : undefined;
  const calendario = useCalendario(division);
  // `/equipos` y el catálogo traen el `equipoId` que pide la plantilla.
  const equiposDivision = useEquiposDivision(divisionId);
  const catalogo = useCatalogo();

  const refrescar = useRefrescar(
    claves.division(divisionId),
    claves.clasificaciones(),
    claves.catalogo(),
  );

  const datos = useMemo<DatosEquipo | null>(() => {
    if (!calendario.data || !divisionId || !inscripcionId) return null;
    const { partidos } = calendario.data;
    const base = equipoDeCalendario(partidos, inscripcionId);
    if (!base) return null;
    return {
      equipo: completarEquipo(
        base,
        equiposDivision.data ?? [],
        (catalogo.data ?? [])
          .filter((c) => c.division.id === divisionId)
          .map((c) => c.equipo),
      ),
      inscripcionId,
      divisionId,
      partidos: partidosDeEquipo(partidos, base),
      hoy: fechaLocal(new Date()),
    };
  }, [
    calendario.data,
    equiposDivision.data,
    catalogo.data,
    divisionId,
    inscripcionId,
  ]);

  const contenido = (d: DatosEquipo) => {
    switch (seccion) {
      case 'resumen':
        return <ResumenConTabla datos={d} />;
      case 'partidos':
        return <PartidosEquipo datos={d} />;
      case 'plantilla':
        return <PlantillaEquipo datos={d} />;
      case 'estadisticas':
        return <EstadisticasEquipo datos={d} />;
      case 'alineaciones':
        return <AlineacionesEquipo datos={d} />;
    }
  };

  return (
    <Pagina
      titulo={datos?.equipo.nombre ?? t('equipo.titulo')}
      testId="page-equipo"
      detalle
      alRefrescar={refrescar}
    >
      <Consulta
        consulta={calendario}
        error={t('equipo.error')}
        cargando={<CabeceraSkeleton />}
      >
        {() =>
          datos ? (
            <>
              <header className="equipo-cabecera" data-testid="equipo-cabecera">
                <Escudo
                  logoUrl={datos.equipo.logoUrl}
                  nombre={datos.equipo.nombre}
                  abreviatura={datos.equipo.nombreAbrev}
                  tamano={64}
                  transicion={transicion.escudo(datos.inscripcionId)}
                />
                <h1
                  className="equipo-cabecera__nombre"
                  data-transicion={transicion.nombre(datos.inscripcionId)}
                >
                  {datos.equipo.nombre}
                </h1>
              </header>
              <IonSegment
                className="segmento"
                scrollable
                value={seccion}
                onIonChange={(e) => setSeccion(e.detail.value as Seccion)}
                data-testid="secciones-equipo"
              >
                {SECCIONES.map((s) => (
                  <IonSegmentButton
                    key={s}
                    value={s}
                    data-testid={`seccion-${s}`}
                  >
                    {t(`equipo.secciones.${s}`)}
                  </IonSegmentButton>
                ))}
              </IonSegment>
              {contenido(datos)}
            </>
          ) : (
            <p className="nota" data-testid="equipo-no-encontrado">
              {t('equipo.noEncontrado')}
            </p>
          )
        }
      </Consulta>
    </Pagina>
  );
}
