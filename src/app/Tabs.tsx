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
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route } from 'react-router-dom';

import { AjustesModal } from '../features/ajustes/AjustesModal';
import { ClasificacionPage } from '../features/clasificacion/ClasificacionPage';
import { EquipoPage } from '../features/equipo/EquipoPage';
import { EstadisticasPage } from '../features/estadisticas/EstadisticasPage';
import { JugadorPage } from '../features/jugador/JugadorPage';
import { PartidoPage } from '../features/partido/PartidoPage';
import { PartidosPage } from '../features/partidos/PartidosPage';
import { PATRONES, PESTANAS, PESTANA_INICIAL, rutas } from '../ui/rutas';
import { AccionesShellContext } from '../ui/shell';
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

function Shell() {
  const { t } = useTranslation();
  const [tema, cambiarTema] = useTema();
  const [ajustes, setAjustes] = useState(false);
  const acciones = useMemo(
    () => ({ abrirAjustes: () => setAjustes(true) }),
    [],
  );
  useBotonAtras();

  return (
    <AccionesShellContext.Provider value={acciones}>
      <IonTabs>
        <IonRouterOutlet>
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
      <AjustesModal
        abierto={ajustes}
        alCerrar={() => setAjustes(false)}
        tema={tema}
        alCambiarTema={cambiarTema}
      />
    </AccionesShellContext.Provider>
  );
}

export function Tabs() {
  return (
    <IonReactRouter>
      <Shell />
    </IonReactRouter>
  );
}
