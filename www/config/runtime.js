import { getHttp, isNative } from '../utils/env.js';

/**
 * Define el target lógico de ejecución de la app.
 *
 * - android-native: APK/Capacitor en Android
 * - web: navegador web, incluyendo PWA en iPhone y escritorio
 *
 * @returns {'android-native'|'web'} Target actual.
 */
export function getRuntimeTarget() {
  return isNative() ? 'android-native' : 'web';
}

/**
 * Indica si el runtime actual es la app Android nativa.
 *
 * @returns {boolean}
 */
export function isAndroidNativeApp() {
  return getRuntimeTarget() === 'android-native';
}

/**
 * Indica si el runtime actual es web pública o navegador local.
 *
 * @returns {boolean}
 */
export function isWebRuntime() {
  return getRuntimeTarget() === 'web';
}

/**
 * Política de acceso a servicios legacy.
 *
 * Android nativo puede seguir llamando directo para mantener compatibilidad.
 * Web debe ir siempre por backend propio `/api/*`.
 *
 * @returns {'direct'|'proxy'} Estrategia de transporte.
 */
export function getLegacyApiMode() {
  return isAndroidNativeApp() ? 'direct' : 'proxy';
}

/**
 * Política de acceso al bootstrap de SignalR.
 *
 * Android nativo mantiene acceso directo al servicio legacy.
 * Web carga siempre el bootstrap desde `/signalr/hubs` para evitar acoplar el frontend
 * a un origen externo.
 *
 * @returns {'direct'|'proxy'} Estrategia para SignalR.
 */
export function getSignalRMode() {
  return isAndroidNativeApp() ? 'direct' : 'proxy';
}

/**
 * Devuelve true si tiene sentido preferir HTTP nativo de Capacitor para el transporte.
 *
 * @returns {boolean}
 */
export function shouldPreferNativeHttp() {
  return isAndroidNativeApp() && !!getHttp();
}
