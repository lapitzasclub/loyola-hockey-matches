import { IonRouterLink } from '@ionic/react';
import { clipboardOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import { jornadaVisible, mismoEquipo, partidoVisible } from '../../domain';
import type { MiembroAlineacion } from '../../domain';
import { usePartido } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { useRutas } from '../../ui/rutas';
import { TarjetaPartido } from '../../ui/TarjetaPartido';
import type { DatosEquipo } from './tipos';

function Miembro({ miembro }: { miembro: MiembroAlineacion }) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const contenido = (
    <>
      <span className="persona__dorsal">{miembro.dorsal ?? '–'}</span>
      <span className="persona__nombre">{miembro.nombre}</span>
      {miembro.capitan && (
        <span className="chip" title={t('equipo.alineaciones.capitan')}>
          C
        </span>
      )}
      {miembro.titular && (
        <span className="persona__dato">
          {t('equipo.alineaciones.titular')}
        </span>
      )}
    </>
  );
  // El cuerpo técnico no tiene ficha.
  return miembro.rol === 'jugador' || miembro.rol === 'portero' ? (
    <IonRouterLink
      routerLink={rutas.jugador(miembro.plantillaEquipoId)}
      className="persona persona--enlace"
    >
      <span className="persona__interior">{contenido}</span>
    </IonRouterLink>
  ) : (
    <div className="persona">{contenido}</div>
  );
}

/** Alineación del último partido jugado del equipo. */
function UltimaAlineacion({
  partidoId,
  datos,
}: {
  partidoId: string;
  datos: DatosEquipo;
}) {
  const { t } = useTranslation();
  const partido = usePartido(partidoId);
  return (
    <Consulta consulta={partido} error={t('equipo.alineaciones.error')}>
      {(detalle) => {
        const lado = mismoEquipo(detalle.local.equipo, datos.equipo)
          ? detalle.local
          : detalle.visitante;
        const { jugadores, staff } = lado.alineacion;
        if (jugadores.length === 0 && staff.length === 0) {
          return (
            <p className="nota">{t('equipo.alineaciones.sinAlineacion')}</p>
          );
        }
        return (
          <div data-testid="ultima-alineacion">
            {[...jugadores, ...staff].map((m) => (
              <Miembro key={m.plantillaEquipoId} miembro={m} />
            ))}
          </div>
        );
      }}
    </Consulta>
  );
}

/**
 * Hub de alineaciones: la del último partido jugado y la lista de partidos
 * jugados (del más reciente al más antiguo) para abrir las demás.
 */
export function AlineacionesEquipo({ datos }: { datos: DatosEquipo }) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const jugados = datos.partidos
    .filter((p) => p.estado === 'finalizado')
    .reverse();
  const [ultimo] = jugados;

  if (!ultimo) {
    return (
      <EstadoVacio
        testId="alineaciones-vacias"
        icono={clipboardOutline}
        titulo={t('equipo.alineaciones.vacias')}
      />
    );
  }

  return (
    <div data-testid="alineaciones-equipo">
      <section className="seccion">
        <h2 className="seccion__titulo">{t('equipo.alineaciones.ultimo')}</h2>
        <UltimaAlineacion partidoId={ultimo.id} datos={datos} />
      </section>
      <section className="seccion">
        <h2 className="seccion__titulo">{t('equipo.alineaciones.partidos')}</h2>
        <div className="lista-partidos">
          {jugados.map((p) => (
            <TarjetaPartido
              key={p.id}
              visible={partidoVisible(p, datos.hoy)}
              propio={datos.equipo}
              href={rutas.partido(p.id)}
              jornadaDe={(q) =>
                jornadaVisible(datos.calendario, q, datos.hoy, datos.directos)
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
