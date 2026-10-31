import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  calendarOutline,
  listOutline,
  statsChartOutline,
} from 'ionicons/icons';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route } from 'react-router-dom';

import { MenuAjustes } from '../features/ajustes/MenuAjustes';
import { ClasificacionPage } from '../features/clasificacion/ClasificacionPage';
import { EquipoPage } from '../features/equipo/EquipoPage';
import { EstadisticasPage } from '../features/estadisticas/EstadisticasPage';
import { JugadorPage } from '../features/jugador/JugadorPage';
import { PartidoPage } from '../features/partido/PartidoPage';
import { PartidosPage } from '../features/partidos/PartidosPage';
import { useSeleccionEquipo } from '../queries';
import { PATRONES, PESTANAS, PESTANA_INICIAL, rutas } from '../ui/rutas';
import { SelectorEquipo } from '../ui/SelectorEquipo';
import { ShellContext } from '../ui/shell';
import type { Shell as ValorShell } from '../ui/shell';
import { useBotonAtras } from './botonAtras';
import { useTema } from './tema';

const RAICES = {
  partidos: <PartidosPage />,
  clasificacion: <ClasificacionPage />,
  estadisticas: <EstadisticasPage />,
};

const ICONOS = {
  partidos: calendarOutline,
  clasificacion: listOutline,
  estadisticas: statsChartOutline,
};

/**
 * Las pantallas de detalle se registran bajo cada pestaña: así cada una
 * tiene su pila y el back y el swipe de iOS no saltan de pestaña.
 */
const rutasDePestanas = PESTANAS.flatMap((p) => [
  <Route key={p} path={rutas.raiz(p)} element={RAICES[p]} />,
  <Route
    key={`${p}-equipo`}
    path={`${rutas.raiz(p)}/${PATRONES.equipo}`}
    element={<EquipoPage />}
  />,
  <Route
    key={`${p}-partido`}
    path={`${rutas.raiz(p)}/${PATRONES.partido}`}
    element={<PartidoPage />}
  />,
  <Route
    key={`${p}-jugador`}
    path={`${rutas.raiz(p)}/${PATRONES.jugador}`}
    element={<JugadorPage />}
  />,
]);

/** Id del contenido que tapa el menú lateral. */
const PRINCIPAL = 'principal';

function Shell() {
  const { t } = useTranslation();
  const [tema, cambiarTema] = useTema();
  const { catalogo, clave, elegir, grupos, elegido } = useSeleccionEquipo();
  const [selector, setSelector] = useState(false);
  const menu = useRef<HTMLIonMenuElement>(null);
  useBotonAtras();

  const shell = useMemo<ValorShell>(
    () => ({
      abrirSelector: () => setSelector(true),
      equipo: catalogo.isPending
        ? undefined
        : elegido
          ? {
              nombre: elegido.equipo.nombre,
              competicion: elegido.competicion.nombre,
            }
          : null,
    }),
    [catalogo.isPending, elegido],
  );

  return (
    <ShellContext.Provider value={shell}>
      <MenuAjustes
        ref={menu}
        contentId={PRINCIPAL}
        equipo={shell.equipo}
        alCambiarEquipo={() => setSelector(true)}
        tema={tema}
        alCambiarTema={cambiarTema}
      />
      <IonTabs>
        <IonRouterOutlet id={PRINCIPAL}>
          {rutasDePestanas}
          <Route
            path="/"
            element={<Navigate to={rutas.raiz(PESTANA_INICIAL)} replace />}
          />
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          {PESTANAS.map((p) => (
            <IonTabButton key={p} tab={p} href={rutas.raiz(p)}>
              <IonIcon aria-hidden="true" icon={ICONOS[p]} />
              <IonLabel>{t(`tabs.${p}`)}</IonLabel>
            </IonTabButton>
          ))}
        </IonTabBar>
      </IonTabs>
      <SelectorEquipo
        abierto={selector}
        alCerrar={() => setSelector(false)}
        grupos={grupos}
        elegido={clave}
        alElegir={(nueva) => {
          elegir(nueva);
          setSelector(false);
          void menu.current?.close();
        }}
      />
    </ShellContext.Provider>
  );
}

export function Tabs() {
  return (
    <IonReactRouter>
      <Shell />
    </IonReactRouter>
  );
}
