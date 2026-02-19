# 🎯 IMPLEMENTACIÓN MODO SORTEO - GUÍA COMPLETA

## 📋 ÍNDICE
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Requisitos Previos](#requisitos-previos)
3. [Fase 1: Base de Datos](#fase-1-base-de-datos)
4. [Fase 2: Backend API](#fase-2-backend-api)
5. [Fase 3: Frontend Mobile](#fase-3-frontend-mobile)
6. [Fase 4: Testing](#fase-4-testing)
7. [Fase 5: Deployment](#fase-5-deployment)

---

## 📊 RESUMEN EJECUTIVO

### Objetivo
Agregar un tercer modo de escaneo llamado **SORTEO** que permite registrar la participación de asistentes en un sorteo del evento.

### Stack Tecnológico Actual

**Backend:**
- Node.js con TypeScript 5.3.3
- Express 4.18.2
- Prisma ORM 5.7.1
- PostgreSQL
- Arquitectura: Controller → Service → Prisma

**Frontend:**
- React Native 0.81.5
- Expo SDK 54
- TypeScript 5.3.3
- React 19.1.0

### Reglas de Negocio
- ✅ Solo pueden participar quienes ya registraron **ENTRADA**
- ✅ Solo pueden participar quienes ya recibieron **PASAPORTE** (entrega)
- ✅ Cada participante puede registrarse **UNA SOLA VEZ**
- ✅ No hay límite de tiempo para participar
- ✅ No se puede deshacer una participación
- ✅ Debe funcionar igual que entrada/entrega (con validación y modal)

### Flujo Obligatorio
```
1. ENTRADA (Control de acceso)
   ↓
2. ENTREGA (Pasaporte)
   ↓
3. SORTEO (Participación) ← NUEVO
```

### Tiempo Estimado Total
**3.5 - 4 horas** de desarrollo manual
**30-45 minutos** con asistencia de IA

---

## 🔧 REQUISITOS PREVIOS

### Verificar que tienes:
- [x] Node.js instalado
- [x] TypeScript configurado
- [x] Prisma ORM funcionando
- [x] Base de datos PostgreSQL corriendo
- [x] Backend funcionando en puerto 3003
- [x] Frontend (app móvil Expo) funcionando
- [x] Editor de código (VS Code recomendado)

### Estructura actual del proyecto:
```
Wormy-PowerFest-backend/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── scan.controller.ts
│   │   ├── services/
│   │   │   └── scan.service.ts
│   │   ├── routes/
│   │   │   └── scan.routes.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
│
Wormy-PowerFest-app/
├── src/
│   ├── components/
│   │   ├── ScannerView.tsx
│   │   ├── Drawer.tsx
│   │   └── ...
│   ├── services/
│   │   └── scanService.ts
│   ├── types.ts
│   └── config/
│       └── colors.ts
└── package.json
```


---

## 🗄️ FASE 1: BASE DE DATOS (Prisma)

### Paso 1.1: Actualizar Schema de Prisma (2 min)

**Ubicación:** `backend/prisma/schema.prisma`

**Agregar campos al modelo Registration:**

```prisma
model Registration {
  id               String   @id @default(cuid())
  firstName        String
  lastName         String
  phone            String
  email            String
  sports           String[]
  birthDate        DateTime?
  gender           Gender?
  profession       String?
  status           Status   @default(PENDING)
  checkInTime      DateTime?
  registrationDate DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  // Campos para app móvil
  entradaScanned   Boolean  @default(false)
  entradaTime      DateTime?
  entregaScanned   Boolean  @default(false)
  entregaTime      DateTime?
  completoScanned  Boolean  @default(false)
  completoTime     DateTime?
  sorteoScanned    Boolean  @default(false)  // ← NUEVO
  sorteoTime       DateTime?                  // ← NUEVO

  @@index([email])
  @@index([status])
}
```

### Paso 1.2: Ejecutar Migración de Prisma (3 min)

**Ejecutar en la terminal:**

```bash
# Navegar a la carpeta del backend
cd Wormy-PowerFest-backend/backend

# Crear y ejecutar la migración
npx prisma migrate dev --name add_sorteo_fields

# Esto hará automáticamente:
# 1. Crear el archivo de migración SQL en prisma/migrations/
# 2. Aplicar los cambios a la base de datos PostgreSQL
# 3. Regenerar el Prisma Client con los nuevos campos
```

**Verificar que la migración fue exitosa:**

```bash
# Ver el estado de las migraciones
npx prisma migrate status

# Debería mostrar: "Database schema is up to date!"
```

**Si estás en producción:**
```bash
# Usar deploy en lugar de dev
npx prisma migrate deploy
```

**Regenerar el cliente de Prisma (si es necesario):**
```bash
npx prisma generate
```

---

## 🔌 FASE 2: BACKEND API (TypeScript + Express + Prisma)

### Paso 2.1: Actualizar Tipos (5 min)

**Ubicación:** `backend/src/types/index.ts`

**Modificar el tipo ScanMode:**

```typescript
// ANTES
export type ScanMode = 'entrada' | 'entrega' | 'completo';

// DESPUÉS
export type ScanMode = 'entrada' | 'entrega' | 'completo' | 'sorteo';  // ← AGREGAR 'sorteo'
```

**Actualizar ValidateQRDTO:**

```typescript
export interface ValidateQRDTO {
  qr_code: string;
  mode: 'entrada' | 'entrega' | 'completo' | 'sorteo';  // ← AGREGAR 'sorteo'
}
```

---

### Paso 2.2: Actualizar Servicio (30 min)

**Ubicación:** `backend/src/services/scan.service.ts`

**Modificación 1: Actualizar método `validateQR`**

Agregar lógica para validar el modo sorteo:

```typescript
async validateQR(qr_code: string, mode: ScanMode) {
  const registration = await prisma.registration.findUnique({
    where: { id: qr_code },
  });

  if (!registration) {
    return {
      success: false,
      error: {
        code: 'INVALID_QR',
        message: 'Código QR no válido o no existe'
      }
    };
  }

  const canScan = this.canScanMode(registration, mode);

  // ========== NUEVO: Calcular elegibilidad para sorteo ==========
  const eligible_for_sorteo = 
    registration.entradaScanned === true && 
    registration.entregaScanned === true && 
    registration.sorteoScanned === false;
  // ==============================================================

  return {
    success: true,
    data: {
      participant_id: registration.id,
      name: `${registration.firstName} ${registration.lastName}`,
      email: registration.email,
      registration_date: registration.registrationDate,
      status: {
        entrada: registration.entradaScanned,
        entrega: registration.entregaScanned,
        completo: registration.completoScanned,
        sorteo: registration.sorteoScanned  // ← NUEVO
      },
      can_scan: canScan.can,
      eligible_for_sorteo: eligible_for_sorteo,  // ← NUEVO
      message: canScan.message
    }
  };
}
```

**Modificación 2: Agregar método `scanSorteo`**

Agregar este nuevo método después de `scanCompleto`:

```typescript
async scanSorteo(qr_code: string, scanned_at?: string, device_id?: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: qr_code },
  });

  if (!registration) {
    return {
      success: false,
      error: {
        code: 'INVALID_QR',
        message: 'Código QR no válido'
      }
    };
  }

  // Validación 1: Debe tener entrada registrada
  if (!registration.entradaScanned) {
    return {
      success: false,
      error: {
        code: 'NOT_ENTERED',
        message: 'El participante debe registrar entrada primero'
      }
    };
  }

  // Validación 2: Debe tener pasaporte entregado
  if (!registration.entregaScanned) {
    return {
      success: false,
      error: {
        code: 'PASSPORT_NOT_DELIVERED',
        message: 'El participante debe recoger su pasaporte primero'
      }
    };
  }

  // Validación 3: No debe haber participado antes
  if (registration.sorteoScanned) {
    return {
      success: false,
      error: {
        code: 'ALREADY_PARTICIPATED',
        message: 'El participante ya está participando en el sorteo'
      }
    };
  }

  // Actualizar registro
  const updated = await prisma.registration.update({
    where: { id: qr_code },
    data: {
      sorteoScanned: true,
      sorteoTime: scanned_at ? new Date(scanned_at) : new Date()
    }
  });

  return {
    success: true,
    data: {
      scan_id: `scan-${Date.now()}`,
      participant_id: updated.id,
      name: `${updated.firstName} ${updated.lastName}`,
      mode: 'sorteo',
      timestamp: updated.sorteoTime,
      message: 'Participación en sorteo registrada exitosamente'
    }
  };
}
```

**Modificación 3: Actualizar método `canScanMode`**

Agregar lógica para el modo sorteo en el método privado:

```typescript
private canScanMode(registration: any, mode: ScanMode) {
  if (mode === 'entrada') {
    if (registration.entradaScanned) {
      return { can: false, message: 'Ya se registró la entrada' };
    }
    return { can: true, message: 'Puede registrar entrada' };
  }

  if (mode === 'entrega') {
    if (!registration.entradaScanned) {
      return { can: false, message: 'Debe registrar entrada primero' };
    }
    if (registration.entregaScanned) {
      return { can: false, message: 'El pasaporte ya fue entregado' };
    }
    return { can: true, message: 'Puede entregar pasaporte' };
  }

  if (mode === 'completo') {
    if (!registration.entregaScanned) {
      return { can: false, message: 'Debe entregar pasaporte primero' };
    }
    if (registration.completoScanned) {
      return { can: false, message: 'El pasaporte ya está completo' };
    }
    return { can: true, message: 'Puede marcar como completo' };
  }

  // ========== NUEVO: Modo sorteo ==========
  if (mode === 'sorteo') {
    if (!registration.entradaScanned) {
      return { can: false, message: 'Debe registrar entrada primero' };
    }
    if (!registration.entregaScanned) {
      return { can: false, message: 'Debe recoger su pasaporte primero' };
    }
    if (registration.sorteoScanned) {
      return { can: false, message: 'Ya está participando en el sorteo' };
    }
    return { can: true, message: 'Puede registrar participación en sorteo' };
  }
  // ========================================

  return { can: false, message: 'Modo inválido' };
}
```

**Modificación 4: Actualizar método `getStats`**

Agregar contador de sorteo:

```typescript
async getStats(date?: string) {
  const [entrada, entrega, completo, sorteo, total] = await Promise.all([
    prisma.registration.count({ where: { entradaScanned: true } }),
    prisma.registration.count({ where: { entregaScanned: true } }),
    prisma.registration.count({ where: { completoScanned: true } }),
    prisma.registration.count({ where: { sorteoScanned: true } }),  // ← NUEVO
    prisma.registration.count()
  ]);

  const totalScans = entrada + entrega + completo + sorteo;  // ← AGREGAR sorteo

  return {
    success: true,
    data: {
      date: date || new Date().toISOString().split('T')[0],
      total_scans: totalScans,
      by_mode: {
        entrada,
        entrega,
        completo,
        sorteo  // ← NUEVO
      },
      valid_scans: totalScans,
      invalid_scans: 0,
      sorteo_participants: sorteo,  // ← NUEVO
      last_updated: new Date().toISOString()
    }
  };
}
```

**Modificación 5: Actualizar método `getHistory`**

Agregar soporte para filtrar por sorteo:

```typescript
async getHistory(date?: string, mode?: string, limit: number = 50) {
  const where: any = {};
  
  if (mode === 'entrada') {
    where.entradaScanned = true;
  } else if (mode === 'entrega') {
    where.entregaScanned = true;
  } else if (mode === 'completo') {
    where.completoScanned = true;
  } else if (mode === 'sorteo') {  // ← NUEVO
    where.sorteoScanned = true;
  }

  const registrations = await prisma.registration.findMany({
    where,
    take: limit,
    orderBy: { updatedAt: 'desc' }
  });

  const scans = registrations.map(reg => {
    let timestamp = reg.updatedAt;
    if (mode === 'entrada' && reg.entradaTime) timestamp = reg.entradaTime;
    if (mode === 'entrega' && reg.entregaTime) timestamp = reg.entregaTime;
    if (mode === 'completo' && reg.completoTime) timestamp = reg.completoTime;
    if (mode === 'sorteo' && reg.sorteoTime) timestamp = reg.sorteoTime;  // ← NUEVO

    return {
      scan_id: `scan-${reg.id}`,
      participant_id: reg.id,
      name: `${reg.firstName} ${reg.lastName}`,
      mode: mode || 'entrada',
      timestamp,
      status: 'valid'
    };
  });

  return {
    success: true,
    data: {
      total: scans.length,
      scans
    }
  };
}
```


---

### Paso 2.3: Actualizar Controlador (10 min)

**Ubicación:** `backend/src/controllers/scan.controller.ts`

**Modificación 1: Actualizar validación de modos**

En el método `validate`, actualizar el array de modos válidos:

```typescript
async validate(req: Request, res: Response) {
  try {
    const { qr_code, mode }: ValidateQRDTO = req.body;

    if (!qr_code || !mode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'QR code y mode son requeridos'
        }
      });
    }

    // ========== ACTUALIZAR: Agregar 'sorteo' ==========
    if (!['entrada', 'entrega', 'completo', 'sorteo'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MODE',
          message: 'Modo de escaneo no válido'
        }
      });
    }
    // ==================================================

    const result = await scanService.validateQR(qr_code, mode);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error validating QR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Error interno del servidor'
      }
    });
  }
}
```

**Modificación 2: Agregar método `sorteo`**

Agregar este nuevo método después del método `completo`:

```typescript
async sorteo(req: Request, res: Response) {
  try {
    const { qr_code, scanned_at, device_id }: ScanQRDTO = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'QR code es requerido'
        }
      });
    }

    const result = await scanService.scanSorteo(qr_code, scanned_at, device_id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error scanning sorteo:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Error interno del servidor'
      }
    });
  }
}
```

---

### Paso 2.4: Actualizar Rutas (2 min)

**Ubicación:** `backend/src/routes/scan.routes.ts`

**Agregar la nueva ruta:**

```typescript
import { Router } from 'express';
import { ScanController } from '../controllers/scan.controller';

const router = Router();
const controller = new ScanController();

router.post('/validate', (req, res) => controller.validate(req, res));
router.post('/entrada', (req, res) => controller.entrada(req, res));
router.post('/entrega', (req, res) => controller.entrega(req, res));
router.post('/completo', (req, res) => controller.completo(req, res));
router.post('/sorteo', (req, res) => controller.sorteo(req, res));  // ← NUEVO
router.get('/history', (req, res) => controller.history(req, res));
router.get('/stats', (req, res) => controller.stats(req, res));

export default router;
```

---

### Paso 2.5: Compilar y Verificar (5 min)

**Compilar TypeScript:**

```bash
# En la carpeta backend
cd Wormy-PowerFest-backend/backend

# Compilar
npm run build

# Si hay errores de TypeScript, corregirlos antes de continuar
```

**Reiniciar el servidor de desarrollo:**

```bash
# Modo desarrollo con hot reload
npm run dev

# Debería mostrar: "Server running on port 3003"
```

**Verificar que no hay errores de compilación:**

```bash
# Verificar tipos sin compilar
npx tsc --noEmit
```

---

## 📱 FASE 3: FRONTEND MOBILE (React Native + Expo + TypeScript)

### Paso 3.1: Actualizar Tipos (2 min)

**Ubicación:** `Wormy-PowerFest-app/src/types.ts`

```typescript
// ANTES
export type Mode = 'entrada' | 'entrega';

// DESPUÉS
export type Mode = 'entrada' | 'entrega' | 'sorteo';  // ← AGREGAR 'sorteo'

// El resto permanece igual
export interface ScanResult {
  id: string;
  timestamp: string;
  data: string;
  status: 'valid' | 'invalid';
  mode: Mode;
  name?: string;
}
```

---

### Paso 3.2: Agregar Colores (3 min)

**Ubicación:** `Wormy-PowerFest-app/src/config/colors.ts`

```typescript
export const COLORS = {
  primary: {
    main: '#B50095',
    dark: '#800080',
    light: '#E6B3E6',
  },
  secondary: {
    main: '#FCD34D',
    light: '#FFF3CD',
    border: '#FCD34D',
  },
  // ... otros colores existentes ...
  
  // ========== NUEVO: Colores para sorteo ==========
  sorteo: {
    main: '#FFB703',      // Dorado brillante
    light: '#FFF3CD',     // Amarillo claro
    border: '#FCD34D',    // Dorado medio
  },
  // ================================================
  
  // ... resto de colores ...
};
```

---

### Paso 3.3: Actualizar Servicio API (10 min)

**Ubicación:** `Wormy-PowerFest-app/src/services/scanService.ts`

**Modificación 1: Actualizar tipo en validateQR**

```typescript
// Actualizar el tipo del parámetro mode
export const validateQR = async (
  qrCode: string,
  mode: 'entrada' | 'entrega' | 'completo' | 'sorteo'  // ← AGREGAR 'sorteo'
): Promise<ValidationResponse> => {
  // ... resto del código permanece igual
};
```

**Modificación 2: Agregar función `registrarSorteo`**

Agregar al final del archivo, después de `registrarCompleto`:

```typescript
// ========== NUEVO: Registrar participación en sorteo ==========
export const registrarSorteo = async (qrCode: string): Promise<ScanResponse> => {
  try {
    const response = await fetch(`${API_URL}/sorteo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qr_code: qrCode,
        scanned_at: new Date().toISOString(),
        device_id: API_CONFIG.DEVICE_ID,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering sorteo:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'No se pudo conectar con el servidor',
      },
    };
  }
};
// ==============================================================
```

---

### Paso 3.4: Actualizar Menú Drawer (5 min)

**Ubicación:** `Wormy-PowerFest-app/src/components/Drawer.tsx`

**Modificar el array `menuItems`:**

```typescript
const menuItems: { 
  id: Mode; 
  label: string; 
  iconName: string;
  iconLibrary: 'Ionicons' | 'MaterialCommunityIcons';
  description: string;
}[] = [
  { 
    id: 'entrada', 
    label: 'ENTRADA', 
    iconName: 'enter-outline',
    iconLibrary: 'Ionicons',
    description: 'Control de acceso al evento'
  },
  { 
    id: 'entrega', 
    label: 'ENTREGA DE PASAPORTE', 
    iconName: 'clipboard-text-outline',
    iconLibrary: 'MaterialCommunityIcons',
    description: 'Registro de entrega'
  },
  // ========== NUEVO ==========
  { 
    id: 'sorteo', 
    label: 'SORTEO', 
    iconName: 'gift-outline',
    iconLibrary: 'Ionicons',
    description: 'Participación en sorteo'
  },
  // ===========================
];
```

---

### Paso 3.5: Actualizar Vista de Escaneo (15 min)

**Ubicación:** `Wormy-PowerFest-app/src/components/ScannerView.tsx`

**Modificación 1: Importar el nuevo servicio**

```typescript
import { 
  validateQR, 
  registrarEntrada, 
  registrarEntrega,
  registrarSorteo  // ← NUEVO
} from '../services/scanService';
```

**Modificación 2: Actualizar función `getModeLabel`**

```typescript
const getModeLabel = (m: Mode) => {
  switch (m) {
    case 'entrada':
      return 'CONTROL DE ENTRADA';
    case 'entrega':
      return 'ENTREGA DE PASAPORTE';
    case 'sorteo':  // ← NUEVO
      return 'REGISTRO DE SORTEO';
    default:
      return m;
  }
};
```

**Modificación 3: Actualizar función `processScan`**

```typescript
const processScan = async (qrCode: string, participantName: string) => {
  try {
    let result;

    // Registrar según el modo seleccionado
    if (mode === 'entrada') {
      result = await registrarEntrada(qrCode);
    } else if (mode === 'entrega') {
      result = await registrarEntrega(qrCode);
    } 
    // ========== NUEVO ==========
    else if (mode === 'sorteo') {
      result = await registrarSorteo(qrCode);
    }
    // ===========================

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour12: false });

    if (result.success) {
      // ... resto del código permanece igual
    }
  } catch (error) {
    // ... manejo de errores permanece igual
  }
};
```

---

### Paso 3.6: Actualizar Log de Escaneos (5 min)

**Ubicación:** `Wormy-PowerFest-app/src/components/ScanLog.tsx`

**Modificar función `getModeInfo`:**

```typescript
const getModeInfo = (mode: string) => {
  switch (mode) {
    case 'entrada':
      return {
        label: 'ENTRADA',
        icon: 'enter-outline' as const,
        iconLib: 'Ionicons' as const,
        description: 'Control de acceso',
      };
    case 'entrega':
      return {
        label: 'ENTREGA',
        icon: 'clipboard-text' as const,
        iconLib: 'MaterialCommunityIcons' as const,
        description: 'Pasaporte entregado',
      };
    // ========== NUEVO ==========
    case 'sorteo':
      return {
        label: 'SORTEO',
        icon: 'gift' as const,
        iconLib: 'Ionicons' as const,
        description: 'Participación registrada',
      };
    // ===========================
    default:
      return {
        label: mode.toUpperCase(),
        icon: 'qrcode-scan' as const,
        iconLib: 'MaterialCommunityIcons' as const,
        description: 'Escaneo',
      };
  }
};
```

---

### Paso 3.7: Actualizar Vista de Historial (8 min)

**Ubicación:** `Wormy-PowerFest-app/src/components/HistoryView.tsx`

**Modificación 1: Agregar filtro**

```typescript
const filters: Array<{ 
  id: Mode | 'all'; 
  label: string; 
  icon: string; 
  iconLib: 'Ionicons' | 'MaterialCommunityIcons' 
}> = [
  { id: 'all', label: 'TODOS', icon: 'apps', iconLib: 'Ionicons' },
  { id: 'entrada', label: 'ENTRADA', icon: 'enter-outline', iconLib: 'Ionicons' },
  { id: 'entrega', label: 'ENTREGA', icon: 'clipboard-text-outline', iconLib: 'MaterialCommunityIcons' },
  // ========== NUEVO ==========
  { id: 'sorteo', label: 'SORTEO', icon: 'gift-outline', iconLib: 'Ionicons' },
  // ===========================
];
```

**Modificación 2: Agregar estadística**

```typescript
// Calcular estadísticas
const totalScans = scans.length;
const validScans = scans.filter(s => s.status === 'valid').length;
const invalidScans = scans.filter(s => s.status === 'invalid').length;
const entradaScans = scans.filter(s => s.mode === 'entrada').length;
const entregaScans = scans.filter(s => s.mode === 'entrega').length;
const sorteoScans = scans.filter(s => s.mode === 'sorteo').length;  // ← NUEVO
```

---

### Paso 3.8: Verificar TypeScript (5 min)

**Verificar que no hay errores de tipos:**

```bash
# En la carpeta del frontend
cd Wormy-PowerFest-app

# Verificar tipos
npx tsc --noEmit

# Si hay errores, corregirlos antes de continuar
```

**Reiniciar el servidor de Expo:**

```bash
# Reiniciar Expo
npm start

# O con limpieza de caché
expo start -c
```


---

## 🧪 FASE 4: TESTING

### Paso 4.1: Testing Backend con TypeScript (30 min)

**Usar Postman, Insomnia, Thunder Client o cURL:**

#### Test 1: Validar QR para sorteo (participante elegible)

```bash
POST http://localhost:3003/api/scan/validate
Content-Type: application/json

{
  "qr_code": "clrxxx123",
  "mode": "sorteo"
}

# Respuesta esperada (TypeScript):
{
  "success": true,
  "data": {
    "participant_id": "clrxxx123",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "registration_date": "2024-01-15T10:00:00.000Z",
    "status": {
      "entrada": true,
      "entrega": true,
      "completo": false,
      "sorteo": false
    },
    "can_scan": true,
    "eligible_for_sorteo": true,
    "message": "Puede registrar participación en sorteo"
  }
}
```

#### Test 2: Validar QR sin entrada

```bash
POST http://localhost:3003/api/scan/validate
Content-Type: application/json

{
  "qr_code": "clrxxx456",
  "mode": "sorteo"
}

# Respuesta esperada:
{
  "success": true,
  "data": {
    "can_scan": false,
    "eligible_for_sorteo": false,
    "message": "Debe registrar entrada primero"
  }
}
```

#### Test 3: Registrar participación en sorteo

```bash
POST http://localhost:3003/api/scan/sorteo
Content-Type: application/json

{
  "qr_code": "clrxxx123",
  "scanned_at": "2024-01-15T14:30:00Z",
  "device_id": "mobile-app-001"
}

# Respuesta esperada:
{
  "success": true,
  "data": {
    "scan_id": "scan-1705329000000",
    "participant_id": "clrxxx123",
    "name": "Juan Pérez",
    "mode": "sorteo",
    "timestamp": "2024-01-15T14:30:00.000Z",
    "message": "Participación en sorteo registrada exitosamente"
  }
}
```

#### Test 4: Intentar registrar duplicado

```bash
POST http://localhost:3003/api/scan/sorteo
Content-Type: application/json

{
  "qr_code": "clrxxx123",
  "scanned_at": "2024-01-15T14:35:00Z",
  "device_id": "mobile-app-001"
}

# Respuesta esperada:
{
  "success": false,
  "error": {
    "code": "ALREADY_PARTICIPATED",
    "message": "El participante ya está participando en el sorteo"
  }
}
```

#### Test 5: Obtener historial de sorteo

```bash
GET http://localhost:3003/api/scan/history?mode=sorteo&limit=50

# Respuesta esperada:
{
  "success": true,
  "data": {
    "total": 10,
    "scans": [
      {
        "scan_id": "scan-clrxxx123",
        "participant_id": "clrxxx123",
        "name": "Juan Pérez",
        "mode": "sorteo",
        "timestamp": "2024-01-15T14:30:00.000Z",
        "status": "valid"
      }
    ]
  }
}
```

#### Test 6: Obtener estadísticas

```bash
GET http://localhost:3003/api/scan/stats

# Respuesta esperada:
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "total_scans": 450,
    "by_mode": {
      "entrada": 200,
      "entrega": 150,
      "completo": 50,
      "sorteo": 50
    },
    "valid_scans": 450,
    "invalid_scans": 0,
    "sorteo_participants": 50,
    "last_updated": "2024-01-15T15:00:00.000Z"
  }
}
```

#### Test 7: Verificar en Prisma Studio

```bash
# Abrir Prisma Studio para ver los datos
cd Wormy-PowerFest-backend/backend
npx prisma studio

# Navegar a la tabla Registration
# Verificar que los campos sorteoScanned y sorteoTime se actualizan correctamente
```

---

### Paso 4.2: Testing Frontend React Native (30 min)

#### Test 1: Seleccionar modo sorteo
1. Abrir la app en Expo Go o emulador
2. Presionar botón de menú (hamburguesa)
3. Verificar que aparece opción "SORTEO" con icono de regalo (gift-outline)
4. Seleccionar "SORTEO"
5. Verificar que se cierra el drawer
6. Verificar que el header muestra "REGISTRO DE SORTEO"

#### Test 2: Escanear participante elegible
1. Con modo SORTEO activo
2. Presionar botón "TOCAR PARA ESCANEAR"
3. Permitir acceso a cámara (si es primera vez)
4. Escanear QR de participante con entrada y entrega registradas
5. Verificar que aparece modal con:
   - Nombre del participante
   - Email
   - Mensaje: "¿Deseas registrar la participación en sorteo?"
6. Presionar "Registrar"
7. Verificar mensaje de éxito: "Participación en sorteo registrada exitosamente"
8. Verificar que aparece banner verde con:
   - Icono de check
   - "VÁLIDO"
   - Nombre del participante
   - Hora del escaneo

#### Test 3: Escanear sin entrada
1. Escanear QR de participante sin entrada
2. Verificar modal de error:
   - Título: "Error de Validación"
   - Mensaje: "Debe registrar entrada primero"
3. Verificar banner rojo con "INVÁLIDO"

#### Test 4: Escanear sin pasaporte
1. Escanear QR de participante con entrada pero sin pasaporte
2. Verificar modal de error:
   - Mensaje: "Debe recoger su pasaporte primero"

#### Test 5: Escanear duplicado
1. Escanear mismo QR dos veces
2. En el segundo intento verificar:
   - Modal: "Ya está participando en el sorteo"
   - Banner rojo con "INVÁLIDO"

#### Test 6: Ver historial
1. Abrir menú
2. Seleccionar "HISTORIAL"
3. Verificar que aparecen los escaneos de sorteo
4. Verificar icono de regalo en las tarjetas de sorteo
5. Presionar filtro "SORTEO"
6. Verificar que solo muestra escaneos de sorteo

#### Test 7: Verificar estadísticas
1. En vista de historial
2. Verificar contador de sorteo
3. Verificar que se actualiza después de cada escaneo

---

### Paso 4.3: Testing de Casos Edge (15 min)

#### Test 1: Conexión perdida
1. Desactivar WiFi/datos en el dispositivo
2. Intentar escanear
3. Verificar mensaje: "No se pudo conectar con el servidor"

#### Test 2: QR inválido
1. Escanear QR que no existe en la base de datos
2. Verificar mensaje: "Código QR no válido o no existe"

#### Test 3: Cambio de modo
1. Seleccionar modo ENTRADA
2. Cambiar a modo SORTEO
3. Verificar que el banner anterior desaparece
4. Verificar que el header se actualiza correctamente

#### Test 4: Verificar tipos TypeScript
```bash
# Backend
cd Wormy-PowerFest-backend/backend
npx tsc --noEmit

# Frontend
cd Wormy-PowerFest-app
npx tsc --noEmit

# No debe haber errores de tipos
```

---

## 🚀 FASE 5: DEPLOYMENT

### Paso 5.1: Preparar Backend para Producción (10 min)

**Compilar TypeScript:**

```bash
cd Wormy-PowerFest-backend/backend

# Compilar a JavaScript
npm run build

# Verificar que se creó la carpeta dist/
ls dist/
```

**Verificar variables de entorno:**

```bash
# Archivo .env en producción
DATABASE_URL="postgresql://user:password@host:5432/dbname"
PORT=3003
NODE_ENV=production
```

**Script de deployment:**

```bash
# deploy-backend.sh
#!/bin/bash

echo "🚀 Iniciando deployment del backend TypeScript..."

# 1. Detener servidor actual
pm2 stop wormy-backend

# 2. Hacer backup de la base de datos
pg_dump -U postgres wormy_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Pull del código
git pull origin main

# 4. Instalar dependencias
npm install

# 5. Ejecutar migraciones de Prisma
npx prisma migrate deploy

# 6. Generar Prisma Client
npx prisma generate

# 7. Compilar TypeScript
npm run build

# 8. Reiniciar servidor
pm2 restart wormy-backend

# 9. Verificar estado
pm2 status

echo "✅ Deployment completado"
```

**Configurar PM2:**

```bash
# Iniciar con PM2
pm2 start dist/server.js --name wormy-backend

# Guardar configuración
pm2 save

# Auto-start en reinicio
pm2 startup
```

---

### Paso 5.2: Preparar Frontend para Producción (10 min)

**Actualizar configuración de API:**

```typescript
// src/config/api.ts
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://192.168.1.100:3003/api/scan'  // Desarrollo
    : 'https://api.wormy-powerfest.com/api/scan',  // Producción
  DEVICE_ID: 'mobile-app-001',
  TIMEOUT: 10000,
};
```

**Compilar para producción:**

```bash
cd Wormy-PowerFest-app

# Para Android
eas build --platform android --profile production

# Para iOS
eas build --platform ios --profile production

# O si usas Expo Go
expo publish
```

---

### Paso 5.3: Verificación Post-Deployment (15 min)

**Checklist de verificación:**

- [ ] Backend TypeScript compilado sin errores
- [ ] Prisma Client generado correctamente
- [ ] Backend responde en producción
- [ ] Endpoint `/api/scan/sorteo` funciona
- [ ] Endpoint `/api/scan/validate` incluye `eligible_for_sorteo`
- [ ] Endpoint `/api/scan/stats` incluye contador de sorteo
- [ ] App móvil se conecta al backend de producción
- [ ] Modo SORTEO aparece en el menú
- [ ] Validaciones funcionan correctamente
- [ ] No se permiten duplicados
- [ ] Historial muestra escaneos de sorteo
- [ ] Estadísticas se actualizan correctamente
- [ ] No hay errores de TypeScript en consola

**Comandos de verificación:**

```bash
# Verificar que el backend está corriendo
curl https://api.wormy-powerfest.com/health

# Probar endpoint de validación
curl -X POST https://api.wormy-powerfest.com/api/scan/validate \
  -H "Content-Type: application/json" \
  -d '{"qr_code":"clrxxx123","mode":"sorteo"}'

# Verificar estadísticas
curl https://api.wormy-powerfest.com/api/scan/stats

# Ver logs de PM2
pm2 logs wormy-backend --lines 100
```

---

## 📊 RESUMEN FINAL

### ✅ Lo que se implementó:

#### Backend (Node.js + TypeScript + Prisma):
- ✅ Migración de Prisma con campos `sorteoScanned` y `sorteoTime`
- ✅ Actualización del modelo `Registration` en schema.prisma
- ✅ Actualización de tipos en `types/index.ts` (ScanMode)
- ✅ Nuevo método `scanSorteo` en `ScanService`
- ✅ Actualización de método `validateQR` con campo `eligible_for_sorteo`
- ✅ Actualización de método `getStats` con contador de sorteo
- ✅ Actualización de método `getHistory` para filtrar por sorteo
- ✅ Actualización de método `canScanMode` con lógica de sorteo
- ✅ Nuevo método `sorteo` en `ScanController`
- ✅ Nueva ruta `POST /api/scan/sorteo` en `scan.routes.ts`

#### Frontend (React Native + Expo + TypeScript):
- ✅ Actualización de tipos: `Mode = 'entrada' | 'entrega' | 'sorteo'`
- ✅ Nuevos colores para modo sorteo (dorado/amarillo)
- ✅ Nueva función `registrarSorteo` en `scanService.ts`
- ✅ Nuevo item "SORTEO" en el menú `Drawer.tsx`
- ✅ Actualización de `ScannerView.tsx` para soportar modo sorteo
- ✅ Actualización de `ScanLog.tsx` con icono de regalo
- ✅ Actualización de `HistoryView.tsx` con filtro de sorteo

### 🎯 Validaciones Implementadas:

1. ✅ Solo pueden participar quienes registraron ENTRADA
2. ✅ Solo pueden participar quienes recibieron PASAPORTE
3. ✅ Una participación por persona (sin duplicados)
4. ✅ Validación con Prisma (transacciones atómicas)
5. ✅ Validación en frontend y backend
6. ✅ Mensajes de error descriptivos con tipos TypeScript
7. ✅ Modal de confirmación antes de registrar
8. ✅ Type safety completo en todo el flujo

### 🔄 Flujo Completo:

```
1. Usuario abre app React Native
   ↓
2. Selecciona modo "SORTEO" del menú
   ↓
3. Presiona "TOCAR PARA ESCANEAR"
   ↓
4. Escanea código QR
   ↓
5. Frontend llama a validateQR (TypeScript)
   ↓
6. Backend valida con Prisma:
   - ¿QR existe en Registration?
   - ¿entradaScanned === true?
   - ¿entregaScanned === true?
   - ¿sorteoScanned === false?
   ↓
7. Si todo OK → Modal de confirmación
   ↓
8. Usuario confirma
   ↓
9. Frontend llama a registrarSorteo
   ↓
10. Backend actualiza con Prisma:
    - sorteoScanned = true
    - sorteoTime = now()
   ↓
11. App muestra mensaje de éxito
   ↓
12. Banner verde con check ✓
```

### ⏱️ Tiempo Total Estimado:

| Fase | Tiempo Manual | Con IA |
|------|---------------|--------|
| Fase 1: Prisma Migration | 5 min | 2 min |
| Fase 2: Backend TypeScript | 1.5 horas | 15 min |
| Fase 3: Frontend React Native | 1 hora | 10 min |
| Fase 4: Testing | 1.25 horas | 20 min |
| Fase 5: Deployment | 40 min | 10 min |
| **TOTAL** | **3.5-4 horas** | **30-45 min** |

---

## 🎉 PRÓXIMOS PASOS:

1. **Ejecutar migración de Prisma** (Paso 1.2)
   ```bash
   cd backend
   npx prisma migrate dev --name add_sorteo_fields
   ```

2. **Implementar cambios en el backend TypeScript** (Fase 2 completa)
   - Actualizar tipos
   - Actualizar servicio
   - Actualizar controlador
   - Actualizar rutas

3. **Implementar cambios en el frontend React Native** (Fase 3 completa)
   - Actualizar tipos
   - Actualizar servicios
   - Actualizar componentes

4. **Realizar testing exhaustivo** (Fase 4 completa)
   - Backend con Postman/Insomnia
   - Frontend en Expo
   - Verificar tipos TypeScript

5. **Hacer deployment a producción** (Fase 5 completa)
   - Compilar TypeScript
   - Ejecutar migraciones en producción
   - Desplegar con PM2

---

## 🎊 ¡IMPLEMENTACIÓN COMPLETA!

Esta guía está actualizada para tu stack tecnológico:
- **Backend:** Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend:** React Native + Expo + TypeScript

Sigue los pasos en orden y verifica cada uno antes de continuar al siguiente.

**¡Buena suerte con el sorteo! 🎁**

---

**Última actualización:** 2024-01-15  
**Versión del documento:** 2.0 (TypeScript + Prisma)  
**Stack:** Node.js + TypeScript + Prisma + React Native + Expo  
**Autor:** Equipo de Desarrollo Wormy-PowerFest
