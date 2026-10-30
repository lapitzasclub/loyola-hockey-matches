import { IonRouterLink } from '@ionic/react';

import type { PersonaVisible } from '../../domain';
import { useRutas } from '../../ui/rutas';

/** `#7 Nombre`; enlaza a la ficha del jugador salvo en el cuerpo técnico. */
export function PersonaEnlace({ persona }: { persona: PersonaVisible }) {
  const rutas = useRutas();
  const texto = persona.dorsal
    ? `#${persona.dorsal} ${persona.nombre}`
    : persona.nombre;
  return persona.conFicha ? (
    <IonRouterLink
      routerLink={rutas.jugador(persona.plantillaEquipoId)}
      className="persona-enlace"
    >
      {texto}
    </IonRouterLink>
  ) : (
    <span>{texto}</span>
  );
}
