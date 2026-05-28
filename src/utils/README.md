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
