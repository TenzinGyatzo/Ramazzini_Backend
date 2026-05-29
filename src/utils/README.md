# Utilidades (Utils)

Este directorio contiene funciones utilitarias reutilizables para toda la aplicación.

## Archivos Disponibles

### `names.ts`
Funciones para el manejo y formateo de nombres y campos de texto.

#### `formatearNombreCompleto(primerApellido, segundoApellido, nombre)`
Formatea el nombre completo de un trabajador concatenando primer apellido, segundo apellido y nombre, filtrando valores undefined o vacíos.

**Parámetros:**
- `primerApellido`: string | undefined - Primer apellido del trabajador
- `segundoApellido`: string | undefined - Segundo apellido del trabajador (opcional)
- `nombre`: string | undefined - Nombre del trabajador

**Retorna:** string - Nombre completo formateado o 'Sin nombre' si no hay datos válidos

**Ejemplo:**
```typescript
import { formatearNombreCompleto } from '../utils/names';

const nombreCompleto = formatearNombreCompleto('García', undefined, 'Juan');
// Retorna: "García Juan"
```

#### `formatearNombreTrabajador(trabajador)`
Formatea el nombre completo de un trabajador usando un objeto Trabajador.

**Parámetros:**
- `trabajador`: Objeto con propiedades `primerApellido`, `segundoApellido`, `nombre`

**Retorna:** string - Nombre completo formateado

**Ejemplo:**
```typescript
import { formatearNombreTrabajador } from '../utils/names';

const nombreCompleto = formatearNombreTrabajador({
  primerApellido: 'García',
  segundoApellido: 'López',
  nombre: 'Juan'
});
// Retorna: "García López Juan"
```

#### `formatearCampo(valor)`
Formatea un campo individual, retornando cadena vacía si es undefined o vacío.

**Parámetros:**
- `valor`: string | undefined - Valor del campo a formatear

**Retorna:** string - Valor formateado o cadena vacía

**Ejemplo:**
```typescript
import { formatearCampo } from '../utils/names';

const campoFormateado = formatearCampo(undefined);
// Retorna: ""

const campoFormateado2 = formatearCampo('  ');
// Retorna: ""

const campoFormateado3 = formatearCampo('  Juan  ');
// Retorna: "Juan"
```

#### `formatearCampos(campos, separador)`
Formatea múltiples campos concatenándolos, filtrando valores undefined o vacíos.

**Parámetros:**
- `campos`: Array de campos a concatenar
- `separador`: string - Separador entre campos (por defecto un espacio)

**Retorna:** string - Campos concatenados o cadena vacía si no hay datos válidos

**Ejemplo:**
```typescript
import { formatearCampos } from '../utils/names';

const camposFormateados = formatearCampos(['Juan', undefined, 'García'], ' - ');
// Retorna: "Juan - García"
```

#### `formatearNombreFirmante(firmante)`
Formatea el nombre de un médico, enfermera o técnico firmante. Si no hay `primerApellido` (registro legacy), devuelve solo `nombre`.

#### `sanitizarNombreFirmanteParaArchivo(firmante)`
Genera un slug seguro para nombres de archivo de firma a partir del nombre completo del firmante.

## Uso en Informes

Estas funciones están diseñadas para ser utilizadas en todos los informes PDF para evitar que aparezcan valores "undefined" en los documentos generados.

### Antes (problemático):
```typescript
{ text: trabajador.primerApellido + ' ' + trabajador.segundoApellido + ' ' + trabajador.nombre, style: 'value' }
// Si algún campo es undefined, aparece "undefined" en el PDF
```

### Después (correcto):
```typescript
import { formatearNombreTrabajador } from '../../../utils/names';

{ text: formatearNombreTrabajador(trabajador), style: 'value' }
// Los campos undefined se filtran automáticamente
```

## Beneficios

1. **Consistencia**: Todos los informes manejan los nombres de la misma manera
2. **Mantenibilidad**: Cambios en la lógica de formateo se hacen en un solo lugar
3. **Legibilidad**: El código es más claro y expresivo
4. **Robustez**: Evita errores de valores undefined en los PDFs
5. **Reutilización**: Las funciones pueden ser usadas en otros módulos de la aplicación

---

## Enforcement de Consentimiento Informado Diario

### `guards/daily-consent.guard.ts` y `decorators/require-daily-consent.decorator.ts`

Sistema de enforcement backend centralizado para consentimiento informado diario. El guard valida que exista un consentimiento diario válido antes de permitir ejecutar acciones protegidas.

#### Uso Básico

```typescript
import { UseGuards } from '@nestjs/common';
import { DailyConsentGuard } from '../../utils/guards/daily-consent.guard';
import { RequireDailyConsent } from '../../utils/decorators/require-daily-consent.decorator';

@Post(':documentType/crear')
@UseGuards(DailyConsentGuard)
@RequireDailyConsent({ action: 'create_document' })
async createDocument(
  @Param('trabajadorId') trabajadorId: string,
  @Param('documentType') documentType: string,
  @Body() createDto: any,
) {
  // El guard ya validó el consentimiento antes de llegar aquí
  // Si no hay consentimiento, se lanza un error 403 CONSENT_REQUIRED
}
```

#### Opciones del Decorador

```typescript
@RequireDailyConsent({
  action?: string;                    // Acción que requiere consentimiento (ej: 'create_document')
  skipIfNoTrabajadorId?: boolean;     // Si true, no valida si no hay trabajadorId
})
```

**Parámetros:**
- `action` (opcional): Identificador de la acción que requiere consentimiento. Ejemplos: `'create_document'`, `'export_giis'`, `'finalize_document'`
- `skipIfNoTrabajadorId` (opcional): Si es `true`, el guard no valida consentimiento si no se puede extraer `trabajadorId` del request

#### Comportamiento

1. **Si `dailyConsentEnabled === false`**: El guard permite la request sin validar (pass-through silencioso)
2. **Si `dailyConsentEnabled === true`**: 
   - Extrae `trabajadorId` desde múltiples fuentes (ruta, body, query)
   - Obtiene `proveedorSaludId` desde el trabajador
   - Calcula `dateKey` usando timezone del proveedor (backend es fuente de verdad)
   - Busca consentimiento existente en la base de datos
   - Si NO existe: lanza `ForbiddenException` con `errorCode: CONSENT_REQUIRED` (403)
   - Si existe: permite continuar al handler

#### Extracción de trabajadorId

El guard extrae `trabajadorId` desde múltiples fuentes en este orden de prioridad:
1. Parámetro de ruta (`@Param('trabajadorId')`)
2. Body del request (`dto.trabajadorId`)
3. Query parameter (`@Query('trabajadorId')`)

#### Formato de Error

Cuando no hay consentimiento, se lanza un error con este formato:

```json
{
  "statusCode": 403,
  "message": "Se requiere consentimiento informado diario para realizar esta acción",
  "errorCode": "CONSENT_REQUIRED",
  "details": {
    "trabajadorId": "507f1f77bcf86cd799439011",
    "dateKey": "2024-03-15",
    "action": "create_document"
  }
}
```

#### Helpers

##### `helpers/daily-consent.helper.ts`

Funciones helper para el guard:

- `extractTrabajadorId(context: ExecutionContext)`: Extrae `trabajadorId` desde múltiples fuentes del request
- `getProveedorSaludIdFromTrabajador(trabajadorId, trabajadorModel, centroTrabajoModel, empresaModel)`: Obtiene `proveedorSaludId` desde un `trabajadorId` (Trabajador → CentroTrabajo → Empresa → ProveedorSalud)

#### Registro en Módulos

El guard debe ser registrado como provider en los módulos que lo usan:

```typescript
import { DailyConsentGuard } from '../../utils/guards/daily-consent.guard';

@Module({
  providers: [
    // ... otros providers
    DailyConsentGuard,
  ],
  imports: [
    // El módulo debe importar ConsentimientoDiarioModule y ProveedoresSaludModule
    // También debe tener los modelos necesarios en MongooseModule.forFeature:
    // - ConsentimientoDiario
    // - Trabajador
    // - CentroTrabajo
    // - Empresa
  ],
})
export class ExpedientesModule {}
```

#### Notas de Implementación

- El guard es **defensivo**: Si algo falla (trabajadorId no encontrado, error de DB), falla de forma segura (no permite acceso por defecto)
- El guard es **silencioso en SIN_REGIMEN**: No hace queries innecesarias si `dailyConsentEnabled === false`
- El backend es la **fuente de verdad del "día"**: El `dateKey` se calcula en el servidor usando timezone del proveedor, no se acepta del cliente
- El guard solo aplica para proveedores con régimen **SIRES_NOM024** cuando `dailyConsentEnabled === true`
