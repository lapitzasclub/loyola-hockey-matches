/**
 * Rate limit por IP. El plan gratuito de KV da 1000 escrituras al día, así
 * que no se puede contar cada petición en KV como hacía la v1: se cuenta en
 * la memoria del isolate y KV solo guarda los bloqueos, para que otros
 * isolates los respeten. Las lecturas de KV se espacian por IP.
 */

/** Lo poco de KV que hace falta (y que se puede simular en tests). */
export interface KvLimite {
  get(clave: string): Promise<string | null>;
  put(
    clave: string,
    valor: string,
    opciones: { expirationTtl: number },
  ): Promise<void>;
}

interface Cubo {
  inicio: number;
  cuenta: number;
  /** Instante hasta el que la IP está bloqueada (0 si no lo está). */
  bloqueadaHasta: number;
}

export interface OpcionesLimite {
  maximo: number;
  ventanaMs: number;
  /** Cada cuánto se vuelve a mirar en KV si otra instancia bloqueó la IP. */
  consultaKvMs?: number;
  ahora?: () => number;
}

/** KV no admite caducidades de menos de 60 s. */
const TTL_MINIMO_KV = 60;
/** A partir de aquí se limpian las IP con la ventana ya vencida. */
const MAX_IPS = 10_000;

export function crearLimitador({
  maximo,
  ventanaMs,
  consultaKvMs = 30_000,
  ahora = Date.now,
}: OpcionesLimite) {
  const cubos = new Map<string, Cubo>();
  const kvMiradoHasta = new Map<string, number>();

  function limpiar(t: number) {
    if (cubos.size < MAX_IPS) return;
    for (const [ip, cubo] of cubos) {
      if (t - cubo.inicio >= ventanaMs && cubo.bloqueadaHasta <= t) {
        cubos.delete(ip);
        kvMiradoHasta.delete(ip);
      }
    }
  }

  const segundosHasta = (t: number, hasta: number) =>
    Math.max(1, Math.ceil((hasta - t) / 1000));

  return {
    /**
     * Cuenta una petición de `ip`. Devuelve los segundos que debe esperar si
     * se ha pasado del límite, o `null` si puede seguir.
     */
    async comprobar(ip: string, kv?: KvLimite): Promise<number | null> {
      const t = ahora();
      limpiar(t);
      let cubo = cubos.get(ip);
      if (!cubo || (t - cubo.inicio >= ventanaMs && cubo.bloqueadaHasta <= t)) {
        cubo = { inicio: t, cuenta: 0, bloqueadaHasta: 0 };
        cubos.set(ip, cubo);
      }
      if (cubo.bloqueadaHasta > t) return segundosHasta(t, cubo.bloqueadaHasta);

      cubo.cuenta += 1;
      if (cubo.cuenta > maximo) {
        cubo.bloqueadaHasta = cubo.inicio + ventanaMs;
        await kv
          ?.put(`bloqueo:${ip}`, String(cubo.bloqueadaHasta), {
            expirationTtl: Math.max(
              TTL_MINIMO_KV,
              Math.ceil((cubo.bloqueadaHasta - t) / 1000),
            ),
          })
          .catch(() => undefined);
        return segundosHasta(t, cubo.bloqueadaHasta);
      }

      if (kv && (kvMiradoHasta.get(ip) ?? 0) <= t) {
        kvMiradoHasta.set(ip, t + consultaKvMs);
        const valor = await kv.get(`bloqueo:${ip}`).catch(() => null);
        const hasta = Number(valor);
        if (valor && hasta > t) {
          cubo.bloqueadaHasta = hasta;
          return segundosHasta(t, hasta);
        }
      }
      return null;
    },
  };
}
