import { IonRouterLink } from '@ionic/react';
import { clipboardOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import { alineacionVacia, iniciales } from '../../domain';
import type { LadoDetalle, MiembroAlineacion } from '../../domain';
import { Escudo } from '../../ui/Escudo';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { useRutas } from '../../ui/rutas';

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className="persona__foto persona__foto--iniciales" aria-hidden>
      {iniciales(nombre)}
    </span>
  );
}

function Miembro({ miembro }: { miembro: MiembroAlineacion }) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const staff = miembro.rol !== 'jugador' && miembro.rol !== 'portero';
  const contenido = (
    <>
      <Avatar nombre={miembro.nombre} />
      <span className="persona__dorsal">{miembro.dorsal ?? '–'}</span>
      <span className="persona__nombre">{miembro.nombre}</span>
      {miembro.capitan && (
        <span
          className="chip"
          title={t('partido.alineaciones.capitan')}
          aria-label={t('partido.alineaciones.capitan')}
        >
          C
        </span>
      )}
      {staff ? (
        <span className="persona__dato">
          {t(`equipo.roles.${miembro.rol}`)}
        </span>
      ) : (
        miembro.titular && (
          <span className="persona__dato">
            {t('partido.alineaciones.titular')}
          </span>
        )
      )}
    </>
  );
  // El cuerpo técnico no tiene ficha, como en la v1.
  return staff ? (
    <div className="persona" data-testid="miembro-staff">
      {contenido}
    </div>
  ) : (
    <IonRouterLink
      routerLink={rutas.jugador(miembro.plantillaEquipoId)}
      className="persona persona--enlace"
      data-testid="miembro-jugador"
    >
      <span className="persona__interior">{contenido}</span>
    </IonRouterLink>
  );
}

function Bloque({
  titulo,
  miembros,
}: {
  titulo: string;
  miembros: MiembroAlineacion[];
}) {
  if (miembros.length === 0) return null;
  return (
    <div>
      <h3 className="seccion__subtitulo">{titulo}</h3>
      {miembros.map((m) => (
        <Miembro key={m.plantillaEquipoId} miembro={m} />
      ))}
    </div>
  );
}

function AlineacionLado({ lado, id }: { lado: LadoDetalle; id: string }) {
  const { t } = useTranslation();
  const { jugadores, staff } = lado.alineacion;
  return (
    <section className="seccion" data-testid={id}>
      <h2 className="seccion__titulo seccion__titulo--equipo">
        <Escudo
          logoUrl={lado.equipo.logoUrl}
          nombre={lado.equipo.nombre}
          abreviatura={lado.equipo.nombreAbrev}
          tamano={20}
        />
        {lado.equipo.nombre}
      </h2>
      {alineacionVacia(lado.alineacion) ? (
        <p className="nota">{t('partido.alineaciones.sinAlineacion')}</p>
      ) : (
        <>
          <Bloque
            titulo={t('partido.alineaciones.porteros')}
            miembros={jugadores.filter((m) => m.rol === 'portero')}
          />
          <Bloque
            titulo={t('partido.alineaciones.jugadores')}
            miembros={jugadores.filter((m) => m.rol !== 'portero')}
          />
          <Bloque
            titulo={t('partido.alineaciones.cuerpoTecnico')}
            miembros={staff}
          />
        </>
      )}
    </section>
  );
}

/** Alineación de cada equipo: porteros, jugadores de pista y cuerpo técnico. */
export function AlineacionesPartido({
  local,
  visitante,
}: {
  local: LadoDetalle;
  visitante: LadoDetalle;
}) {
  const { t } = useTranslation();
  if (
    alineacionVacia(local.alineacion) &&
    alineacionVacia(visitante.alineacion)
  ) {
    return (
      <EstadoVacio
        testId="alineaciones-vacias"
        icono={clipboardOutline}
        titulo={t('partido.alineaciones.sinAlineacion')}
      />
    );
  }
  return (
    <div data-testid="alineaciones-partido">
      <AlineacionLado lado={local} id="alineacion-local" />
      <AlineacionLado lado={visitante} id="alineacion-visitante" />
    </div>
  );
}
