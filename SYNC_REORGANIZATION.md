# Reorganización de Sincronización Hevy

## Resumen de Cambios

Se ha reorganizado completamente la funcionalidad de sincronización de Hevy para centralizar el control y mejorar la experiencia del usuario.

## Cambios Implementados

### 1. **Sincronización Automática al Iniciar** ✅

**Ubicación**: `client/src/App.jsx`

- ✅ Se ejecuta automáticamente cuando el usuario inicia sesión
- ✅ Solo se ejecuta **una vez por sesión** (usa `sessionStorage`)
- ✅ Fallo silencioso si no hay API key configurada
- ✅ No bloquea la interfaz de usuario
- ✅ Logs en consola para debugging

**Comportamiento**:
```javascript
// Al iniciar la app (después del login)
1. Verifica si ya se sincronizó en esta sesión
2. Si no, ejecuta sync automático
3. Marca la sesión como sincronizada
4. Si falla, continúa normalmente (el usuario puede sincronizar manualmente)
```

### 2. **Sincronización Manual en Settings** ✅

**Ubicación**: `client/src/pages/Settings.jsx`

Nueva sección agregada: **"Sincronización de Hevy"**

**Características**:
- ✅ Botón de sincronización manual con icono giratorio
- ✅ Descripción clara de qué hace la sincronización
- ✅ Muestra timestamp de la última sincronización
- ✅ Deshabilitado si no hay API key configurada
- ✅ Mensaje de advertencia si falta la API key
- ✅ Mensajes de éxito/error después de sincronizar

**Elementos de UI**:
```
┌─────────────────────────────────────────┐
│ Sincronización de Hevy                  │
├─────────────────────────────────────────┤
│ Sincronización Manual                   │
│                                         │
│ Sincroniza tus entrenamientos desde    │
│ Hevy. Esta acción importará todos...   │
│                                         │
│ [🔄 Sincronizar Ahora]                 │
│                                         │
│ Última sincronización: 17/02/26 13:45  │
│ (o)                                     │
│ ⚠️ Necesitas configurar tu Hevy API... │
└─────────────────────────────────────────┘
```

### 3. **Eliminación de Botones de Sync** ✅

Se eliminaron los botones de sincronización de:

**Dashboard** (`client/src/pages/Dashboard.jsx`):
- ❌ Botón "Sincronizar Hevy" eliminado del header
- ❌ Estado `syncing` eliminado
- ❌ Función `handleSync` eliminada
- ❌ Import `RefreshCw` eliminado

**Workouts** (`client/src/pages/Workouts.jsx`):
- ❌ Botón "Sincronizar Hevy" eliminado del header
- ❌ Estado `syncing` eliminado
- ❌ Función `handleSync` eliminada
- ❌ Import `RefreshCw` eliminado

### 4. **Estilos CSS Agregados** ✅

**Ubicación**: `client/src/pages/Settings.css`

Nuevos estilos para:
- `.sync-btn` - Botón de sincronización con gradiente
- `.sync-btn.spinning` - Animación de rotación del icono
- `.sync-description` - Texto descriptivo
- `.last-sync` - Timestamp de última sincronización (verde)
- `.warning-text` - Mensaje de advertencia (amarillo)
- `@keyframes spin` - Animación de rotación

## Flujo de Usuario

### Primer Uso (Sin API Key)
```
1. Usuario inicia sesión
2. Auto-sync falla silenciosamente (no hay API key)
3. Usuario navega a Settings
4. Ve advertencia: "⚠️ Necesitas configurar tu Hevy API Key primero"
5. Configura API key
6. Hace clic en "Sincronizar Ahora"
7. Datos se importan
8. Ve "Última sincronización: [timestamp]"
```

### Uso Normal (Con API Key)
```
1. Usuario inicia sesión
2. Auto-sync se ejecuta en segundo plano
3. Datos se actualizan automáticamente
4. Usuario ve datos actualizados en Dashboard
5. Si quiere forzar una actualización:
   - Va a Settings
   - Hace clic en "Sincronizar Ahora"
```

### Nueva Sesión
```
1. Usuario cierra y vuelve a abrir la app
2. Inicia sesión
3. Auto-sync se ejecuta de nuevo (nueva sesión)
4. Datos actualizados
```

## Ventajas de esta Implementación

### ✨ Mejor UX
- **Automático**: No requiere acción del usuario
- **No intrusivo**: Fallo silencioso si no está configurado
- **Centralizado**: Un solo lugar para gestionar sync
- **Transparente**: Muestra cuándo fue la última sincronización

### 🎯 Mejor Organización
- **Separación de responsabilidades**: Settings maneja configuración y sync
- **Menos duplicación**: Un solo botón de sync en lugar de múltiples
- **Más limpio**: Dashboard y Workouts sin botones innecesarios

### 🔧 Mejor Mantenimiento
- **Un solo punto de control**: Cambios en sync solo en Settings
- **Consistencia**: Mismo comportamiento en toda la app
- **Debugging más fácil**: Logs claros en consola

## Archivos Modificados

### Modificados
1. **`client/src/App.jsx`**
   - Agregado import de `axios`
   - Agregado `useEffect` para auto-sync
   - Usa `sessionStorage` para tracking

2. **`client/src/pages/Settings.jsx`**
   - Agregado import `RefreshCw`
   - Agregado estados `syncing` y `lastSync`
   - Agregada función `handleSync`
   - Agregada sección "Sincronización de Hevy"

3. **`client/src/pages/Settings.css`**
   - Agregados estilos para sync button
   - Agregada animación `spin`
   - Agregados estilos para mensajes

4. **`client/src/pages/Dashboard.jsx`**
   - Eliminado estado `syncing`
   - Eliminada función `handleSync`
   - Eliminado botón de sync
   - Eliminado import `RefreshCw`

5. **`client/src/pages/Workouts.jsx`**
   - Eliminado estado `syncing`
   - Eliminada función `handleSync`
   - Eliminado botón de sync
   - Eliminado import `RefreshCw`

## API Endpoints Utilizados

### POST `/api/hevy/sync?fullSync=true`
- **Desde**: `App.jsx` (auto-sync) y `Settings.jsx` (manual)
- **Propósito**: Sincronizar todos los datos de Hevy
- **Respuesta**: 200 OK si exitoso, error si falla

## Configuración de Sesión

### sessionStorage
```javascript
// Key: 'hasAutoSynced'
// Value: 'true' | null
// Scope: Por pestaña del navegador
// Duración: Hasta cerrar la pestaña
```

**¿Por qué sessionStorage y no localStorage?**
- `sessionStorage`: Se borra al cerrar la pestaña → sync en cada nueva sesión
- `localStorage`: Persiste indefinidamente → sync solo una vez nunca más

## Testing

### Casos de Prueba

1. **Sin API Key**
   ```
   - Iniciar sesión sin API key
   - Verificar que no hay errores visibles
   - Verificar log en consola: "Auto-sync failed..."
   - Ir a Settings
   - Verificar advertencia visible
   - Botón de sync deshabilitado
   ```

2. **Con API Key**
   ```
   - Configurar API key en Settings
   - Cerrar sesión
   - Iniciar sesión de nuevo
   - Verificar log: "Auto-syncing Hevy data..."
   - Verificar log: "Auto-sync completed successfully"
   - Verificar datos en Dashboard
   ```

3. **Sync Manual**
   ```
   - Ir a Settings
   - Hacer clic en "Sincronizar Ahora"
   - Verificar icono girando
   - Verificar mensaje de éxito
   - Verificar timestamp actualizado
   ```

4. **Múltiples Sesiones**
   ```
   - Abrir app en pestaña 1
   - Abrir app en pestaña 2
   - Cada pestaña sincroniza independientemente
   ```

## Notas Técnicas

### Prevención de Sync Duplicado
```javascript
// En App.jsx
const hasAutoSynced = sessionStorage.getItem('hasAutoSynced');
if (hasAutoSynced) return; // No sincronizar de nuevo
```

### Manejo de Errores
```javascript
// Auto-sync: Fallo silencioso
catch (err) {
    console.error('Auto-sync failed (this is normal if no API key is set):', err);
}

// Manual sync: Muestra error al usuario
catch (err) {
    setMessage({ type: 'error', text: 'Error al sincronizar...' });
}
```

### Timestamp de Última Sincronización
```javascript
// Solo se actualiza en sync manual
setLastSync(new Date());

// Se formatea en español
lastSync.toLocaleString('es-ES', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
})
// Resultado: "17/02/26, 13:45"
```

## Próximos Pasos (Opcional)

### Mejoras Futuras Posibles:
1. **Sync Periódico**: Auto-sync cada X minutos
2. **Indicador de Sync**: Badge o notificación cuando se sincroniza
3. **Historial de Sync**: Tabla con todas las sincronizaciones
4. **Sync Selectivo**: Opción para sincronizar solo ciertos datos
5. **Sync en Background**: Service Worker para sync offline

---

**Fecha**: 2026-02-17  
**Versión**: 6.0.0  
**Estado**: ✅ Implementado y funcionando
