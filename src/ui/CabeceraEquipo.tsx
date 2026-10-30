import { IonIcon } from '@ionic/react';
import { chevronDown } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import { Escudo } from './Escudo';
import { Skeleton } from './Skeleton';

interface Props {
  nombre: string;
  logoUrl: string | null;
  abreviatura?: string;
  competicion: string;
  alCambiar: () => void;
}

/** Equipo elegido, arriba de la lista; al tocarlo se abre el selector. */
export function CabeceraEquipo({
  nombre,
  logoUrl,
  abreviatura,
  competicion,
  alCambiar,
}: Props) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="cabecera-equipo"
      onClick={alCambiar}
      aria-label={t('selector.cambiar')}
      data-testid="cabecera-equipo"
    >
      <Escudo
        logoUrl={logoUrl}
        nombre={nombre}
        abreviatura={abreviatura}
        tamano={48}
      />
      <span className="cabecera-equipo__textos">
        <span className="cabecera-equipo__nombre">{nombre}</span>
        <span className="cabecera-equipo__competicion">{competicion}</span>
      </span>
      <IonIcon className="cabecera-equipo__flecha" icon={chevronDown} />
    </button>
  );
}

export function CabeceraEquipoSkeleton() {
  return (
    <div className="cabecera-equipo cabecera-equipo--skeleton">
      <Skeleton ancho={48} alto={48} redondo />
      <span className="cabecera-equipo__textos">
        <Skeleton ancho={140} alto={16} />
        <Skeleton ancho={100} alto={12} />
      </span>
    </div>
  );
}
