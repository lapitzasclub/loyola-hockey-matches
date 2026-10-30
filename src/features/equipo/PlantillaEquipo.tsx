import { IonRouterLink } from '@ionic/react';
import { peopleOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import type { JugadorDivision } from '../../domain';
import { usePlantilla } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { useRutas } from '../../ui/rutas';
import { Skeleton } from '../../ui/Skeleton';
import type { DatosEquipo } from './tipos';

function Foto({ jugador }: { jugador: JugadorDivision }) {
  const iniciales = jugador.nombre.trim().slice(0, 2).toUpperCase();
  return jugador.fotoUrl ? (
    <img
      className="persona__foto"
      src={jugador.fotoUrl}
      alt=""
      loading="lazy"
    />
  ) : (
    <span className="persona__foto persona__foto--iniciales" aria-hidden>
      {iniciales}
    </span>
  );
}

function Fila({ jugador }: { jugador: JugadorDivision }) {
  const { t } = useTranslation();
  const rutas = useRutas();
  return (
    <IonRouterLink
      routerLink={rutas.jugador(jugador.plantillaEquipoId)}
      className="persona persona--enlace"
      data-testid="jugador-fila"
    >
      <span className="persona__interior">
        <Foto jugador={jugador} />
        <span className="persona__nombre">{jugador.nombre}</span>
        <span className="persona__dato">
          {t('equipo.plantilla.partidos', { count: jugador.partidosJugados })}
        </span>
        <span className="persona__dato persona__dato--fuerte">
          {jugador.esPortero
            ? t('equipo.plantilla.paradas', {
                valor: Math.round(jugador.porcentajeParadas),
              })
            : t('equipo.plantilla.goles', { count: jugador.goles })}
        </span>
      </span>
    </IonRouterLink>
  );
}

function Skeletons() {
  return (
    <div data-testid="plantilla-skeleton">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="persona">
          <Skeleton ancho={36} alto={36} redondo />
          <Skeleton ancho="50%" alto={14} />
        </div>
      ))}
    </div>
  );
}

/** Porteros, jugadores y cuerpo técnico; solo los jugadores enlazan a su ficha. */
export function PlantillaEquipo({ datos }: { datos: DatosEquipo }) {
  const { t } = useTranslation();
  const plantilla = usePlantilla(
    datos.divisionId,
    datos.equipo.equipoId ?? undefined,
  );

  if (!datos.equipo.equipoId) {
    return (
      <EstadoVacio icono={peopleOutline} titulo={t('equipo.plantilla.vacia')} />
    );
  }

  return (
    <div data-testid="plantilla-equipo">
      <Consulta
        consulta={plantilla}
        error={t('equipo.plantilla.error')}
        cargando={<Skeletons />}
      >
        {({ jugadores, staff }) => {
          if (jugadores.length === 0 && staff.length === 0) {
            return (
              <EstadoVacio
                icono={peopleOutline}
                titulo={t('equipo.plantilla.vacia')}
              />
            );
          }
          const porteros = jugadores.filter((j) => j.esPortero);
          const pista = jugadores.filter((j) => !j.esPortero);
          return (
            <>
              {porteros.length > 0 && (
                <section className="seccion">
                  <h2 className="seccion__titulo">
                    {t('equipo.plantilla.porteros')}
                  </h2>
                  {porteros.map((j) => (
                    <Fila key={j.plantillaEquipoId} jugador={j} />
                  ))}
                </section>
              )}
              {pista.length > 0 && (
                <section className="seccion">
                  <h2 className="seccion__titulo">
                    {t('equipo.plantilla.jugadores')}
                  </h2>
                  {pista.map((j) => (
                    <Fila key={j.plantillaEquipoId} jugador={j} />
                  ))}
                </section>
              )}
              {staff.length > 0 && (
                <section className="seccion">
                  <h2 className="seccion__titulo">
                    {t('equipo.plantilla.cuerpoTecnico')}
                  </h2>
                  {staff.map((m) => (
                    <div key={m.plantillaEquipoId} className="persona">
                      <Foto jugador={m} />
                      <span className="persona__nombre">{m.nombre}</span>
                      <span className="persona__dato">
                        {t(`equipo.roles.${m.rol ?? 'staff'}`)}
                      </span>
                    </div>
                  ))}
                </section>
              )}
            </>
          );
        }}
      </Consulta>
    </div>
  );
}
