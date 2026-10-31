import { IonIcon } from '@ionic/react';
import { locationOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import { enlaceMapa } from '../domain';
import type { Coordenadas } from '../domain';
import { destinoMapa } from './plataforma';

interface Props {
  pista: string;
  /** Sin ellas la pista es solo texto. */
  coordenadas: Coordenadas | null;
  /**
   * Dentro de otro enlace (la tarjeta): un `<a>` anidado no es válido, así
   * que se abre el mapa al pulsar sin navegar al detalle.
   */
  anidado?: boolean;
}

/** Nombre de la pista; con coordenadas, abre la ubicación en el mapa. */
export function EnlacePista({ pista, coordenadas, anidado = false }: Props) {
  const { t } = useTranslation();
  if (!coordenadas) return <>{pista}</>;

  const destino = destinoMapa();
  const href = enlaceMapa(coordenadas, pista, destino);
  const etiqueta = t('pista.abrirMapa', { pista });
  const contenido = (
    <>
      <IonIcon icon={locationOutline} aria-hidden="true" />
      {pista}
    </>
  );

  if (!anidado) {
    return (
      <a
        className="enlace-pista"
        href={href}
        // `geo:` lo resuelve Android; lo demás es una web que se abre aparte.
        target={destino === 'geo' ? undefined : '_blank'}
        rel="noopener noreferrer"
        aria-label={etiqueta}
        data-testid="enlace-pista"
      >
        {contenido}
      </a>
    );
  }

  const abrir = () => {
    // Un `<a>` sin insertar en el documento: mismo efecto que pulsar el enlace.
    const a = document.createElement('a');
    a.href = href;
    if (destino !== 'geo') a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };
  return (
    <span
      role="link"
      tabIndex={0}
      className="enlace-pista"
      aria-label={etiqueta}
      data-testid="enlace-pista"
      data-href={href}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        abrir();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        abrir();
      }}
    >
      {contenido}
    </span>
  );
}
