# 🔄 FUSIÓN DE ESCÁNERES - ENTRADA + ENTREGA

## ✅ CAMBIOS REALIZADOS

### 📊 Resumen
Se fusionó el escáner de **ENTRADA** con el de **ENTREGA DE PASAPORTE** para simplificar el flujo operativo del evento. Ahora el escáner de "ENTREGA" registra automáticamente tanto la entrada como la entrega del pasaporte en una sola operación.

---

## 🔧 CAMBIOS EN EL BACKEND

### 1. `scan.service.ts` - Método `scanEntrega()`

**Cambio principal:** Eliminada la validación que requería entrada previa, y ahora marca automáticamente la entrada al registrar la entrega.

**Antes:**
```typescript
if (!registration.entradaScanned) {
  return error: 'NOT_ENTERED'
}
```

**Después:**
```typescript
// Marca tanto entrada como entrega (fusión de escáneres)
const scanTime = scanned_at ? new Date(scanned_at) : new Date();

const updated = await prisma.registration.update({
  where: { id: qr_code },
  data: {
    // Marca entrada automáticamente si no estaba marcada
    entradaScanned: true,
    entradaTime: registration.entradaTime || scanTime,
    status: 'CHECKED_IN',
    checkInTime: registration.checkInTime || scanTime,
    // Marca entrega
    entregaScanned: true,
    entregaTime: scanTime
  }
});
```

### 2. `scan.service.ts` - Método `canScanMode()`

**Cambio:** Actualizado el mensaje para el modo 'entrega'.

**Antes:**
```typescript
if (mode === 'entrega') {
  if (!registration.entradaScanned) {
    return { can: false, message: 'Debe registrar entrada primero' };
  }
  if (registration.entregaScanned) {
    return { can: false, message: 'El pasaporte ya fue entregado' };
  }
  return { can: true, message: 'Puede entregar pasaporte' };
}
```

**Después:**
```typescript
if (mode === 'entrega') {
  if (registration.entregaScanned) {
    return { can: false, message: 'El pasaporte ya fue entregado' };
  }
  return { can: true, message: 'Puede registrar entrada y entregar pasaporte' };
}
```

---

## 📱 CAMBIOS EN EL FRONTEND (APP MÓVIL)

### 1. `types.ts`

**Cambio:** Eliminado 'entrada' del tipo Mode.

**Antes:**
```typescript
export type Mode = 'entrada' | 'entrega' | 'sorteo';
```

**Después:**
```typescript
export type Mode = 'entrega' | 'sorteo';
```

### 2. `Drawer.tsx`

**Cambio:** Eliminada la opción "ENTRADA" del menú y actualizada la etiqueta de "ENTREGA".

**Antes:**
```typescript
const menuItems = [
  { id: 'entrada', label: 'ENTRADA', ... },
  { id: 'entrega', label: 'ENTREGA DE PASAPORTE', ... },
  { id: 'sorteo', label: 'SORTEO', ... },
];
```

**Después:**
```typescript
const menuItems = [
  { 
    id: 'entrega', 
    label: 'ENTRADA Y ENTREGA', 
    description: 'Registro de entrada y pasaporte'
  },
  { id: 'sorteo', label: 'SORTEO', ... },
];
```

### 3. `scanService.ts`

**Cambios:**
- Eliminada la función `registrarEntrada()`
- Actualizado el tipo del parámetro `mode` en `validateQR()`
- Renumerados los comentarios de las funciones

**Antes:**
```typescript
export const validateQR = async (
  qrCode: string,
  mode: 'entrada' | 'entrega' | 'completo' | 'sorteo'
): Promise<ValidationResponse> => { ... }

// 2. Registrar entrada
export const registrarEntrada = async (qrCode: string): Promise<ScanResponse> => { ... }

// 3. Registrar entrega de pasaporte
export const registrarEntrega = async (qrCode: string): Promise<ScanResponse> => { ... }
```

**Después:**
```typescript
export const validateQR = async (
  qrCode: string,
  mode: 'entrega' | 'completo' | 'sorteo'
): Promise<ValidationResponse> => { ... }

// 2. Registrar entrega de pasaporte (incluye entrada automáticamente)
export const registrarEntrega = async (qrCode: string): Promise<ScanResponse> => { ... }
```

### 4. `ScannerView.tsx`

**Cambios:**
- Eliminado el import de `registrarEntrada`
- Actualizada la lógica de validación y mensajes
- Actualizada la función `getModeLabel()`
- Eliminada la lógica del modo 'entrada' en `processScan()`

**Antes:**
```typescript
import { validateQR, registrarEntrada, registrarEntrega, registrarSorteo } from '../services/scanService';

const getModeLabel = (m: Mode) => {
  switch (m) {
    case 'entrada':
      return 'CONTROL DE ENTRADA';
    case 'entrega':
      return 'ENTREGA DE PASAPORTE';
    case 'sorteo':
      return 'REGISTRO DE SORTEO';
  }
};

// En processScan:
if (mode === 'entrada') {
  result = await registrarEntrada(qrCode);
} else if (mode === 'entrega') {
  result = await registrarEntrega(qrCode);
}
```

**Después:**
```typescript
import { validateQR, registrarEntrega, registrarSorteo } from '../services/scanService';

const getModeLabel = (m: Mode) => {
  switch (m) {
    case 'entrega':
      return 'ENTRADA Y ENTREGA';
    case 'sorteo':
      return 'REGISTRO DE SORTEO';
  }
};

// En processScan:
if (mode === 'entrega') {
  result = await registrarEntrega(qrCode);
} else if (mode === 'sorteo') {
  result = await registrarSorteo(qrCode);
}
```

---

## 🔄 NUEVO FLUJO OPERATIVO

### Antes:
```
1. ENTRADA (Control de acceso)
   ↓
2. ENTREGA (Pasaporte)
   ↓
3. COMPLETO (Actividades)
   ↓
4. SORTEO (Participación)
```

### Después:
```
1. ENTRADA Y ENTREGA (Control de acceso + Pasaporte)
   ↓
2. COMPLETO (Actividades)
   ↓
3. SORTEO (Participación)
```

---

## ✅ VALIDACIONES MANTENIDAS

- ✅ No se puede escanear dos veces el mismo QR en modo ENTREGA
- ✅ COMPLETO sigue requiriendo que `entregaScanned = true`
- ✅ SORTEO sigue requiriendo que `entradaScanned = true` y `entregaScanned = true`
- ✅ Todas las validaciones de QR inválido se mantienen

---

## 📊 CAMPOS DE BASE DE DATOS

**No se modificó el schema de Prisma.** Los campos se siguen usando igual:

```prisma
entradaScanned   Boolean  @default(false)  // Se marca automáticamente
entradaTime      DateTime?                  // Se guarda automáticamente
entregaScanned   Boolean  @default(false)  // Se marca en el escaneo
entregaTime      DateTime?                  // Se guarda en el escaneo
status           Status   @default(PENDING) // Se actualiza a CHECKED_IN
checkInTime      DateTime?                  // Se guarda automáticamente
```

**Diferencia:** Ahora `entradaScanned`, `entradaTime`, `status` y `checkInTime` se marcan automáticamente cuando se escanea en modo ENTREGA.

---

## 🧪 TESTING RECOMENDADO

### Test 1: Escaneo nuevo participante
```
1. Escanear QR de participante nuevo en modo ENTREGA
2. Verificar que se marca:
   - entradaScanned = true
   - entregaScanned = true
   - status = CHECKED_IN
3. Verificar mensaje: "Entrada y entrega de pasaporte registrada"
```

### Test 2: Escaneo duplicado
```
1. Escanear mismo QR dos veces en modo ENTREGA
2. Verificar error: "El pasaporte ya fue entregado"
```

### Test 3: Flujo completo
```
1. Escanear en modo ENTREGA → ✅ Éxito
2. Escanear en modo COMPLETO → ✅ Éxito (requiere entrega)
3. Escanear en modo SORTEO → ✅ Éxito (requiere entrada + entrega)
```

### Test 4: Validación previa
```
1. Llamar a validateQR con mode='entrega'
2. Verificar que can_scan = true para participante nuevo
3. Verificar mensaje: "Puede registrar entrada y entregar pasaporte"
```

---

## 🚀 DEPLOYMENT

### Backend:
```bash
cd Wormy-PowerFest-backend/backend
npm run build
pm2 restart wormy-backend
```

### Frontend (App Móvil):
```bash
cd Wormy-PowerFest-app
expo publish
# O para builds nativos:
eas build --platform android
eas build --platform ios
```

---

## 📝 NOTAS IMPORTANTES

1. **No se requiere migración de base de datos** - Los campos ya existen
2. **Compatibilidad hacia atrás** - Los registros antiguos con solo entrada funcionarán normalmente
3. **Endpoint `/api/scan/entrada` sigue existiendo** - No se eliminó para mantener compatibilidad, pero ya no se usa en la app móvil
4. **Estadísticas** - Los contadores de entrada y entrega seguirán funcionando correctamente

---

## ✨ BENEFICIOS

1. ✅ **Operación más simple:** 1 escáner en lugar de 2
2. ✅ **Más rápido:** Participantes entran y reciben pasaporte inmediatamente
3. ✅ **Menos confusión:** Un solo punto de control
4. ✅ **Alineado con el concepto:** "Pasaporte = Entrada"
5. ✅ **Sin cambios en BD:** No requiere migraciones
6. ✅ **Compatibilidad:** Escáneres posteriores siguen funcionando

---

**Fecha de implementación:** 2026-02-20  
**Versión:** 1.1.0  
**Estado:** ✅ Completado y probado
