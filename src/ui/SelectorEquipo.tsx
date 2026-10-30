import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import { claveEquipo } from '../domain';
import type { GrupoCategoria } from '../domain';
import { Escudo } from './Escudo';

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  grupos: readonly GrupoCategoria[];
  /** `claveEquipo` del elegido. */
  elegido: string | null;
  alElegir: (clave: string) => void;
}

/** Hoja con los equipos Loyola agrupados por categoría. */
export function SelectorEquipo({
  abierto,
  alCerrar,
  grupos,
  elegido,
  alElegir,
}: Props) {
  const { t } = useTranslation();
  return (
    <IonModal isOpen={abierto} onDidDismiss={alCerrar} data-testid="selector">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('selector.titulo')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={alCerrar}>{t('common.cerrar')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="selector">
          {grupos.map(({ categoria, equipos }) => (
            <section key={categoria} className="selector__grupo">
              <h3 className="selector__categoria">{categoria}</h3>
              <ul>
                {equipos.map((entrada) => {
                  const clave = claveEquipo(entrada);
                  const activo = clave === elegido;
                  return (
                    <li key={clave}>
                      <button
                        type="button"
                        className={`selector__equipo${activo ? ' selector__equipo--activo' : ''}`}
                        aria-pressed={activo}
                        data-testid="selector-equipo"
                        onClick={() => alElegir(clave)}
                      >
                        <Escudo
                          logoUrl={entrada.equipo.logoUrl}
                          nombre={entrada.equipo.nombre}
                          abreviatura={entrada.equipo.nombreAbrev}
                          tamano={40}
                        />
                        <span className="selector__textos">
                          <span className="selector__nombre">
                            {entrada.equipo.nombre}
                          </span>
                          <span className="selector__competicion">
                            {entrada.competicion.nombre}
                          </span>
                        </span>
                        {activo && (
                          <IonIcon
                            className="selector__marca"
                            icon={checkmarkCircle}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </IonContent>
    </IonModal>
  );
}
