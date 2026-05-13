# Release Android

## Flujo recomendado

### 1. Validar frontend compartido

```bash
npm run lint
npm run build
```

### 2. Sincronizar Android

```bash
npm run android:sync
```

### 3. Abrir proyecto nativo

```bash
npm run android:open
```

## Desde Android Studio

### Build de debug
- usar configuración normal de ejecución
- probar en dispositivo o emulador

### Build de release
Pasos típicos:
1. **Build > Generate Signed App Bundle / APK**
2. elegir:
   - Android App Bundle (`.aab`) para Play Store, recomendado
   - APK firmado si necesitas distribución manual
3. seleccionar keystore de firma
4. generar release

## Antes de publicar

Checklist:
- [ ] frontend actualizado en `dist`
- [ ] `npm run android:sync` ejecutado
- [ ] probar navegación principal
- [ ] probar selector de equipo
- [ ] probar partidos y clasificación
- [ ] probar detalle de partido
- [ ] probar botón atrás Android
- [ ] probar tema claro/oscuro si el cambio lo afecta

## Versionado Android actual

En `android/app/build.gradle`:
- `versionCode`
- `versionName`

Antes de una release real conviene actualizarlos manualmente.

## Nota

La app Android sigue siendo un target plenamente soportado. La versión web pública no sustituye este flujo, solo añade un canal más de distribución usando el mismo frontend compartido.
