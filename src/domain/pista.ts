export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/** Coordenadas de la pista; null si la federación no las tiene (o solo una). */
export function crearCoordenadas(
  latitud: number | null | undefined,
  longitud: number | null | undefined,
): Coordenadas | null {
  return latitud == null || longitud == null ? null : { latitud, longitud };
}

/** Cómo abrir la pista: la app de mapas de cada sistema. */
export type DestinoMapa = 'geo' | 'apple' | 'google';

/**
 * Enlace que abre la ubicación en un mapa:
 * - `geo`: Android, que deja elegir la app de mapas;
 * - `apple`: iPhone y iPad, donde abre Mapas;
 * - `google`: el resto (escritorio).
 */
export function enlaceMapa(
  { latitud, longitud }: Coordenadas,
  nombre: string,
  destino: DestinoMapa,
): string {
  const punto = `${latitud},${longitud}`;
  const etiqueta = encodeURIComponent(nombre);
  switch (destino) {
    case 'geo':
      return `geo:${punto}?q=${punto}(${etiqueta})`;
    case 'apple':
      return `https://maps.apple.com/?ll=${punto}&q=${etiqueta}`;
    case 'google':
      return `https://maps.google.com/?q=${punto}`;
  }
}
