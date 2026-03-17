# Phase 7: Campos CEX en Nota Médica — Research

**Researched:** 2026-03-17
**Domain:** Backend (NestJS/Mongoose), Frontend (Vue 3/Pinia), GIIS CEX Mapping
**Confidence:** HIGH

## Summary

Se investigó el codebase completo para determinar cómo agregar 8 campos CEX (genero, derechohabiencia, peso, talla, circunferenciaCintura, glucemia, tipoMedicion, resultadoObtenidoaTravesde) a la nota médica. Los hallazgos principales son:

1. **Ninguno de los 8 campos existe actualmente** en el schema Mongoose (`nota-medica.schema.ts`) ni en el DTO (`create-nota-medica.dto.ts`). Todos deben ser creados desde cero.
2. **El mapper CEX (`cex.mapper.ts`) ya referencia los 8 campos con valores hardcoded por defecto** (peso=999, talla=999, circunferenciaCintura=0, glucemia=0, tipoMedicion=-1, resultadoObtenidoaTravesde=-1, genero=derivado de sexoCURP, derechohabiencia="99"). Solo requiere modificar estos defaults para leer de la nota médica real.
3. **Los patrones frontend están bien establecidos** — Step5.vue (signos vitales) proporciona el patrón exacto de "Se desconoce" con checkbox, y exploracionFisicaSteps/Step2.vue muestra el patrón de somatometría con cálculo de IMC.

**Primary recommendation:** Agregar los 8 campos al schema/DTO del backend, crear 3 nuevos steps frontend replicando los patrones existentes, y actualizar el mapper CEX para leer los campos reales en lugar de defaults hardcoded.

## Standard Stack

No se requieren bibliotecas adicionales. Todo se implementa con el stack existente:

### Core (ya instalado)
| Library | Purpose | Rol en esta fase |
|---------|---------|------------------|
| `@nestjs/mongoose` + `mongoose` | Schema/Model Mongoose | Agregar 8 campos al schema NotaMedica |
| `class-validator` + `class-transformer` | DTO validation | Decoradores @IsOptional, @IsNumber, @ValidateIf, @Min, @Max, @IsIn, @Matches |
| Vue 3 (Composition API) | Frontend components | 3 nuevos steps con `<script setup>` |
| Pinia | State management | `formDataNotaMedica` (reactive object, sin schema fijo) |
| pdfmake | PDF generation | Agregar secciones al informe nota-medica.informe.ts |

### No se necesitan
- No se necesitan nuevas dependencias npm
- No se necesitan nuevos módulos NestJS
- No se necesitan migraciones de BD (Mongoose es schemaless; campos nuevos son opcionales)

## Architecture Patterns

### Backend: Schema + DTO

**Patrón actual (verificado en `nota-medica.schema.ts` líneas 1-165):**

```typescript
// Schema Mongoose — todos los campos opcionales con @Prop({ required: false })
@Prop({ required: false })
tensionArterialSistolica?: number;

// DTO — ValidateIf para validación condicional (patrón de signos vitales)
@IsOptional()
@IsNumber({ maxDecimalPlaces: 0 })
@ValidateIf((o) => o.tensionArterialSistolica != null && o.tensionArterialSistolica !== 0)
@Min(50, { message: 'CEX: sistólica mínimo 50 mmHg' })
@Max(300, { message: 'CEX: sistólica máximo 300 mmHg' })
tensionArterialSistolica?: number;
```

**Aplicar a los 8 nuevos campos:**
- Todos opcionales (`@Prop({ required: false })` en schema, `@IsOptional()` en DTO)
- ValidateIf para rangos: solo validar si el valor no es el "desconocido" (0 o 999 según campo)
- Validación condicional para tipoMedicion y resultadoObtenidoaTravesde (solo si glucemia≠0)

### Frontend: Step Pattern (verificado en Step5.vue líneas 1-293)

```
1. Refs locales con valores default
2. Refs "seDesconoce" por campo (checkbox)
3. Helper getValFromSource(field, default) con prioridad: formData > currentDocument > default
4. onMounted: cargar valores de formData o currentDocument
5. watch: sincronizar a formDataNotaMedica reactivamente
6. onUnmounted: syncFormData() final
7. computed: mensajes de error por rango CEX
8. Template: input + checkbox "Se desconoce" + error message
```

### FormStepper: Configuración de steps (verificado en FormStepper.vue líneas 626-639)

```typescript
// Patrón actual — array de objetos { component, name }
} else if (documentos.currentTypeOfDocument === 'notaMedica') {
    stepsStore.setSteps([
      { component: Step1NotaMedica, name: 'Paso 1' },
      { component: Step2NotaMedica, name: 'Paso 2' },
      // ... hasta Step11NotaMedica
    ]);
}
```

Cambiar a 14 steps: agregar 3 imports nuevos + renumerar archivos existentes.

### Form Data Store (verificado en formDataStore.ts líneas 1-151)

```typescript
// formDataNotaMedica es un ref({}) — objeto vacío reactivo
const formDataNotaMedica = ref({});
// Los steps asignan propiedades dinámicamente: formDataNotaMedica.peso = 80;
// NO requiere esquema predefinido — se agregan propiedades al vuelo
```

**No se necesita modificar formDataStore.ts** — el store usa `ref({})` genérico sin tipo. Los steps simplemente asignan las nuevas propiedades.

### Anti-Patterns a Evitar
- **No crear validadores backend custom** para la lógica condicional glucemia→tipoMedicion. Usar `@ValidateIf` es suficiente.
- **No crear un store separado** para los nuevos campos. Usar el `formDataNotaMedica` existente.
- **No renumerar archivos antes de tiempo** — primero crear los 3 nuevos steps, después renumerar los existentes en un solo commit atómico.

## Don't Hand-Roll

| Problema | No Construir | Usar | Por qué |
|----------|-------------|------|---------|
| Validación condicional glucemia→tipoMedicion | Custom validator class | `@ValidateIf((o) => o.glucemia != null && o.glucemia !== 0)` | class-validator ya soporta esto |
| Cálculo IMC | Función nueva | Replicar `calcularIMC()` de exploracionFisicaSteps/Step2.vue | Ya probada y funcional |
| Mapeo derechohabiencia múltiple | Parser custom | `@Matches(/^(\d{1,2})(&\d{1,2}){0,8}$/)` + validación frontend | Regex simple, validación en frontend |
| Categoría circunferencia cintura | Tabla lookup | Replicar `setCategoriaCircunferenciaCintura()` de Step2.vue | Ya existe por sexo |

## Common Pitfalls

### Pitfall 1: Renumeración de Steps rompe imports
**What goes wrong:** Renombrar Step3.vue → Step4.vue requiere actualizar TODOS los imports en FormStepper.vue y puede causar conflictos.
**Why it happens:** FormStepper.vue importa cada step individualmente por nombre de archivo.
**How to avoid:** Usar rename atómico: crear los 3 nuevos steps primero con nombres temporales, luego hacer la renumeración completa en un solo paso.
**Warning signs:** `Step3NotaMedica` en FormStepper.vue apunta al archivo equivocado.

### Pitfall 2: Valores "desconocido" diferentes por campo
**What goes wrong:** Confundir qué valor = "desconocido" para cada campo CEX.
**Why it happens:** CEX usa 999 para peso/talla, 0 para circunferenciaCintura/glucemia/genero, -1 para tipoMedicion/resultadoObtenidoaTravesde, "0" (string) para derechohabiencia.
**How to avoid:** Definir constantes explícitas:
```typescript
// Backend DTO defaults
const CEX_DESCONOCE_PESO = 999;
const CEX_DESCONOCE_TALLA = 999;
const CEX_DESCONOCE_CINTURA = 0;
const CEX_DESCONOCE_GLUCEMIA = 0;
const CEX_DESCONOCE_TIPO_MEDICION = -1;
const CEX_DESCONOCE_RESULTADO_GLUCOSA = -1;
const CEX_DESCONOCE_GENERO = 0;
const CEX_DESCONOCE_DERECHOHABIENCIA = "0";
```
**Warning signs:** Signos vitales usan null/0 en frontend → 0 en CEX, pero peso/talla usan 999.

### Pitfall 3: Derechohabiencia es string con "&" separador
**What goes wrong:** Tratar derechohabiencia como number simple.
**Why it happens:** Los demás campos CEX son numéricos, pero derechohabiencia es string con formato "2&3&5" (múltiples afiliaciones).
**How to avoid:** En schema Mongoose usar `@Prop({ type: String })`. En DTO usar `@IsString()` + `@Matches()`. En frontend usar checkboxes múltiples que construyan el string "2&3&5".
**Warning signs:** El mapper CEX ya tiene `derechohabiencia: '99'` como string.

### Pitfall 4: ValidateIf paso reference en validarNotaMedicaPreSubmit
**What goes wrong:** La función `validarNotaMedicaPreSubmit` en `frontend/src/helpers/validacionCampos.ts` referencia `paso: 5` hardcoded para sistólica/diastólica. Con la renumeración, signos vitales pasa del step 5 al step 6.
**How to avoid:** Actualizar `validarNotaMedicaPreSubmit` para usar los nuevos números de paso después de la renumeración (paso 5 → paso 6).
**Warning signs:** Toast de error lleva al paso incorrecto.

### Pitfall 5: genero vs sexo
**What goes wrong:** Confundir el campo `genero` CEX (identidad de género: 8 opciones) con `sexo` del trabajador (Masculino/Femenino).
**Why it happens:** El mapper actual ya deriva `genero` del sexo CURP (`const genero = sexoCURP`). Ahora genero será un campo propio de la nota médica con opciones 0-6, 88.
**How to avoid:** El mapper CEX debe priorizar `consulta.genero` si existe, y fallback a derivar de sexoCURP solo si genero es 0 (no especificado).

### Pitfall 6: Talla en cm (CEX) vs metros (exploración física)
**What goes wrong:** Copiar la lógica de Step2.vue de exploración física sin convertir: ahí usa metros (1.40-2.20), CEX pide centímetros (30-220).
**How to avoid:** Para nota médica: input en cm, calcular IMC con `talla/100` para convertir a metros. Rango del input: 30-220 cm.

## Code Examples

### Backend: Nuevos campos en schema Mongoose

```typescript
// nota-medica.schema.ts — agregar después de saturacionOxigeno
@Prop({ required: false })
genero?: number; // 0=No especificado, 1-6, 88=Otro

@Prop({ required: false })
derechohabiencia?: string; // "0", "2&3", etc.

@Prop({ required: false })
peso?: number; // kg, 1-400, 999=desconoce

@Prop({ required: false })
talla?: number; // cm, 30-220, 999=desconoce

@Prop({ required: false })
circunferenciaCintura?: number; // cm, 20-300, 0=desconoce

@Prop({ required: false })
glucemia?: number; // mg/dl, 20-999, 0=desconoce

@Prop({ required: false })
tipoMedicion?: number; // 0=No, 1=Sí (ayunas), -1=NA

@Prop({ required: false })
resultadoObtenidoaTravesde?: number; // 1=Lab, 2=Tira, -1=NA
```

### Backend: DTO con validación condicional

```typescript
// create-nota-medica.dto.ts — patrón ValidateIf para glucemia dependientes
@IsOptional()
@IsNumber({ maxDecimalPlaces: 0 })
@IsIn([0, 1, 2, 3, 4, 5, 6, 88], { message: 'genero: valor no válido' })
genero?: number;

@IsOptional()
@IsString()
@Matches(/^(\d{1,2})(&\d{1,2}){0,8}$/, { message: 'derechohabiencia: formato inválido (ej: "2&3&5")' })
derechohabiencia?: string;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 3 })
@ValidateIf((o) => o.peso != null && o.peso !== 999)
@Min(1, { message: 'CEX: peso mínimo 1 kg' })
@Max(400, { message: 'CEX: peso máximo 400 kg' })
peso?: number;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 0 })
@ValidateIf((o) => o.talla != null && o.talla !== 999)
@Min(30, { message: 'CEX: talla mínima 30 cm' })
@Max(220, { message: 'CEX: talla máxima 220 cm' })
talla?: number;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 0 })
@ValidateIf((o) => o.circunferenciaCintura != null && o.circunferenciaCintura !== 0)
@Min(20, { message: 'CEX: circunferencia cintura mínima 20 cm' })
@Max(300, { message: 'CEX: circunferencia cintura máxima 300 cm' })
circunferenciaCintura?: number;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 0 })
@ValidateIf((o) => o.glucemia != null && o.glucemia !== 0)
@Min(20, { message: 'CEX: glucemia mínima 20 mg/dl' })
@Max(999, { message: 'CEX: glucemia máxima 999 mg/dl' })
glucemia?: number;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 0 })
@ValidateIf((o) => o.glucemia != null && o.glucemia !== 0)
@IsIn([0, 1], { message: 'tipoMedicion: 0=No ayunas, 1=Ayunas' })
tipoMedicion?: number;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 0 })
@ValidateIf((o) => o.glucemia != null && o.glucemia !== 0)
@IsIn([1, 2], { message: 'resultadoObtenidoaTravesde: 1=Lab, 2=Tira' })
resultadoObtenidoaTravesde?: number;
```

### CEX Mapper: Actualización (cex.mapper.ts)

Cambios necesarios en `valueByField` (líneas 320-508 de cex.mapper.ts):

```typescript
// ANTES (hardcoded defaults):
genero: genero ?? 0,                    // derivado de sexoCURP
derechohabiencia: '99',                 // siempre "Se ignora"
peso: 999,                              // siempre "desconoce"
talla: 999,                             // siempre "desconoce"
circunferenciaCintura: 0,               // siempre "desconoce"
glucemia: 0,                            // siempre "desconoce"
tipoMedicion: -1,                       // siempre "NA"
resultadoObtenidoaTravesde: -1,         // siempre "NA"

// DESPUÉS (leer de consulta con fallback a default):
genero: consulta.genero ?? genero ?? 0,
derechohabiencia: consulta.derechohabiencia || '99',
peso: consulta.peso ?? 999,
talla: consulta.talla ?? 999,
circunferenciaCintura: consulta.circunferenciaCintura ?? 0,
glucemia: consulta.glucemia ?? 0,
tipoMedicion: (consulta.glucemia != null && consulta.glucemia !== 0)
    ? (consulta.tipoMedicion ?? -1) : -1,
resultadoObtenidoaTravesde: (consulta.glucemia != null && consulta.glucemia !== 0)
    ? (consulta.resultadoObtenidoaTravesde ?? -1) : -1,
```

También agregar los nuevos campos a la interface `ConsultaExternaLike`:

```typescript
export interface ConsultaExternaLike {
  // ... campos existentes ...
  genero?: number;
  derechohabiencia?: string;
  peso?: number;
  talla?: number;
  circunferenciaCintura?: number;
  glucemia?: number;
  tipoMedicion?: number;
  resultadoObtenidoaTravesde?: number;
}
```

### Frontend: Nuevo Step3 (Género/Derechohabiencia) — patrón

```vue
<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const genero = ref(0); // 0 = No especificado (default)
const derechohabienciaSeleccion = ref([]); // array de numbers seleccionados

const opcionesGenero = [
  { value: 0, label: 'No especificado' },
  { value: 1, label: 'Masculino' },
  { value: 2, label: 'Femenino' },
  { value: 3, label: 'Transgénero' },
  { value: 4, label: 'Transexual' },
  { value: 5, label: 'Travesti' },
  { value: 6, label: 'Intersexual' },
  { value: 88, label: 'Otro' },
];

const opcionesDerechohabiencia = [
  { value: '0', label: 'No especificado' },
  { value: '1', label: 'Ninguna' },
  { value: '2', label: 'IMSS' },
  { value: '3', label: 'ISSSTE' },
  { value: '4', label: 'PEMEX' },
  { value: '5', label: 'SEDENA' },
  { value: '6', label: 'SEMAR' },
  { value: '8', label: 'Otra' },
  { value: '10', label: 'IMSS Bienestar' },
  { value: '11', label: 'ISSFAM' },
  { value: '14', label: 'OPD IMSS BIENESTAR' },
  { value: '99', label: 'Se ignora' },
];

// Lógica: si selecciona 0, 1 o 99 → exclusivo (no combinar)
// Si selecciona otro → puede combinar hasta 9
</script>
```

### PDF: Secciones a agregar (nota-medica.informe.ts)

La interface `NotaMedica` en nota-medica.informe.ts (línea 269) debe extenderse con los 8 campos. La función `notaMedicaInforme` debe agregar secciones opcionales para somatometría y glucemia (similar a `construirSignosVitales`).

## Análisis Detallado por Archivo

### 1. nota-medica.schema.ts — Estado actual

**Campos existentes (165 líneas):**
- Datos clínicos: tipoNota, fechaNotaMedica, motivoConsulta, antecedentes, exploracionFisica
- Signos vitales: tensionArterialSistolica/Diastolica, frecuenciaCardiaca, frecuenciaRespiratoria, temperatura, saturacionOxigeno
- Diagnósticos: diagnostico (legacy), codigoCIE10Principal, codigosCIE10Complementarios, relacionTemporal, confirmacionDiagnostica, diagnóstico2/3
- Tratamiento/Recomendaciones/Observaciones
- Metadata: idTrabajador, rutaPDF, createdBy, updatedBy, estado, consentimientoDiarioId

**Campos CEX que NO existen:** genero, derechohabiencia, peso, talla, circunferenciaCintura, glucemia, tipoMedicion, resultadoObtenidoaTravesde — ninguno.

**Ubicación recomendada:** Después de `saturacionOxigeno` (línea 43) para mantener agrupación lógica con datos clínicos medibles.

### 2. create-nota-medica.dto.ts — Estado actual

**207 líneas.** Validaciones existentes siguen el patrón:
- `@IsOptional()` para campos no requeridos
- `@ValidateIf()` para validación condicional (ej: solo validar rango si valor ≠ 0)
- `@Min()/@Max()` para rangos CEX
- Mensajes en español

**Patrón para `@Matches` (necesario para derechohabiencia):** No hay uso actual de `@Matches` en el DTO. Necesita importar `Matches` de class-validator. class-validator sí lo soporta.

### 3. cex.mapper.ts — Mapeo actual de campos CEX

**Hallazgo crítico:** Los 8 campos ya aparecen en el mapper con valores hardcoded:

| Campo CEX | Valor actual hardcoded | Línea |
|-----------|----------------------|-------|
| `genero` | `genero ?? 0` (derivado de sexoCURP) | 347 |
| `derechohabiencia` | `'99'` (siempre "Se ignora") | 348 |
| `peso` | `999` (siempre "desconoce") | 364 |
| `talla` | `999` (siempre "desconoce") | 365 |
| `circunferenciaCintura` | `0` (siempre "desconoce") | 366 |
| `glucemia` | `0` (siempre "desconoce") | 388 |
| `tipoMedicion` | `-1` (siempre "NA") | 389 |
| `resultadoObtenidoaTravesde` | `-1` (siempre "NA") | 390 |

**Cambio necesario:** Reemplazar cada hardcoded por lectura del documento `consulta` con fallback al valor actual.

### 4. FormStepper.vue — Configuración de steps

**Imports actuales (líneas 130-140):**
```
import Step1NotaMedica  → Step11NotaMedica (11 imports)
```

**Array de steps (líneas 627-639):**
```
11 entries: Step1NotaMedica ... Step11NotaMedica
```

**Cambio necesario:**
- Agregar 3 imports nuevos (Step3, Step7, Step8 nuevos)
- Renumerar imports existentes (3→4, 4→5, 5→6, 6→9, 7→10, 8→11, 9→12, 10→13, 11→14)
- Actualizar array a 14 entries

### 5. formDataStore.ts — Estado del store

`formDataNotaMedica` es `ref({})` — un objeto reactivo genérico sin tipo. Los steps asignan propiedades dinámicamente. **No requiere cambios.**

### 6. Step5.vue (signos vitales) — Patrón a replicar

Patrón confirmado:
- `getValFromSource(field, default)` — prioridad formData > currentDocument > default
- Checkbox "Se desconoce" por campo que pone valor a 0 (o 999 para peso/talla)
- `syncFormData()` en watch + onUnmounted
- `computed` para mensajes de error de rango CEX

### 7. exploracionFisicaSteps/Step2.vue — Patrón para somatometría

Patrón confirmado con diferencias a adaptar:
- Usa `formDataExploracionFisica` → cambiar a `formDataNotaMedica`
- Altura en metros (1.40-2.20) → cambiar a talla en cm (30-220)
- Rangos: peso 45-200 → expandir a 1-400 (CEX)
- Circunferencia 50-160 → expandir a 20-300 (CEX)
- IMC y categorías: replicar funciones calcularIMC y setCategoriaIMC
- Cálculo IMC: cambiar `peso / (altura ** 2)` a `peso / ((talla/100) ** 2)`
- **Agregar checkbox "Se desconoce"** (no existe en exploración física, sí requerido para nota médica CEX)

### 8. nota-medica.informe.ts — PDF generation

**Interface NotaMedica (línea 269-299):** No incluye los 8 nuevos campos. Debe extenderse.

**Secciones actuales del PDF:**
- Signos Vitales (función `construirSignosVitales`)
- No hay secciones para somatometría ni glucemia

**Cambio necesario:** Agregar funciones similares a `construirSignosVitales` para:
- Somatometría: peso, talla, IMC, circunferencia cintura
- Glucemia: valor, tipo medición, origen resultado
- Datos demográficos: genero, derechohabiencia (opcional en PDF)

### 9. validarNotaMedicaPreSubmit — Validación frontend

**Ubicación:** `frontend/src/helpers/validacionCampos.ts` líneas 668-723

**Problema de renumeración:** La función referencia `paso: 5` hardcoded para la validación sistólica/diastólica. Con la renumeración (Step5 signos vitales → Step6), debe cambiar a `paso: 6`.

**Nuevas validaciones a agregar:**
- peso: rango 1-400 o 999 (paso 7)
- talla: rango 30-220 o 999 (paso 7)
- circunferencia: rango 20-300 o 0 (paso 7)
- glucemia: rango 20-999 o 0 (paso 8)
- tipoMedicion requerido si glucemia ≠ 0 (paso 8)
- resultadoObtenidoaTravesde requerido si glucemia ≠ 0 (paso 8)

### 10. Step6.spec.ts — Patrón de tests

**Ubicación:** `frontend/src/components/steps/notaMedicaSteps/Step6.spec.ts` (99 líneas)

**Patrón verificado:**
- Vitest + @vue/test-utils
- createPinia + setActivePinia en beforeEach
- Mount con stubs para componentes complejos (CIE10Autocomplete)
- Test de políticas regulatorias (SIRES_NOM024 vs SIN_REGIMEN)
- Test de propiedades computed derivadas de stores

**Con la renumeración:** Step6.spec.ts se convierte en Step9.spec.ts (diagnóstico principal).

## Riesgos y Complicaciones

### Riesgo 1: Renumeración masiva de archivos (ALTO impacto, BAJO riesgo)
- **9 archivos Vue** deben renombrarse (Step3→4, Step4→5, ..., Step11→14)
- **1 archivo spec** debe renombrarse (Step6.spec.ts → Step9.spec.ts)
- **FormStepper.vue** debe actualizar 11 imports existentes y agregar 3 nuevos
- **Mitigación:** Hacer la renumeración en un solo commit atómico al final del plan 07-02

### Riesgo 2: Backward compatibility con documentos existentes (BAJO)
- Documentos guardados sin los 8 campos tendrán `undefined` para estos fields
- El mapper CEX ya maneja esto con defaults (`?? 999`, `?? 0`, etc.)
- El frontend `getValFromSource` ya maneja `undefined` → usar default
- **Sin riesgo real** gracias al patrón existente

### Riesgo 3: Derechohabiencia con validación compleja (MEDIO)
- Reglas: selección exclusiva de 0/1/99, múltiple para otros, no repetir, max 9
- Validación debe ser en frontend (UX de checkboxes) Y backend (regex + custom)
- **Mitigación:** Implementar lógica en frontend, validar formato en backend con regex

## Recomendaciones por Plan

### Plan 07-01: Backend (schema, DTO, validaciones)
1. Agregar 8 campos a `nota-medica.schema.ts` (todos opcionales)
2. Agregar 8 validaciones a `create-nota-medica.dto.ts` (siguiendo patrón existente)
3. `update-nota-medica.dto.ts` hereda automáticamente via `PartialType`
4. No se necesitan cambios en `expedientes.service.ts` ni `expedientes.controller.ts` (Mongoose acepta nuevos campos automáticamente)
5. Importar `Matches` en el DTO para validación de derechohabiencia

### Plan 07-02: Frontend (3 nuevos steps + renumeración)
1. Crear Step3.vue nuevo (Género/Derechohabiencia) usando patrón Step5.vue
2. Crear Step7.vue nuevo (Somatometría) replicando exploracionFisicaSteps/Step2.vue con:
   - formDataNotaMedica en lugar de formDataExploracionFisica
   - Talla en cm (30-220) con conversión para IMC
   - Rangos CEX expandidos (peso 1-400, cintura 20-300)
   - Checkbox "Se desconoce" por campo
3. Crear Step8.vue nuevo (Glucemia) con lógica condicional para tipoMedicion/resultadoObtenidoaTravesde
4. Renumerar 9 archivos existentes: Step3→4, Step4→5, Step5→6, Step6→9, Step7→10, Step8→11, Step9→12, Step10→13, Step11→14
5. Actualizar FormStepper.vue: imports + array de 14 steps
6. Actualizar `validarNotaMedicaPreSubmit` en validacionCampos.ts: paso 5→6

### Plan 07-03: Mapeo GIIS CEX y PDF
1. Actualizar `ConsultaExternaLike` interface en cex.mapper.ts con los 8 campos
2. Reemplazar 8 valores hardcoded en `valueByField` por lectura de `consulta` con fallback
3. Actualizar interface `NotaMedica` en nota-medica.informe.ts con los 8 campos
4. Agregar secciones al PDF para somatometría y glucemia (funciones helper como `construirSignosVitales`)

## Open Questions

1. **¿Mostrar genero y derechohabiencia en el PDF?**
   - Genero: probablemente sí (dato clínico relevante)
   - Derechohabiencia: probablemente sí (dato administrativo útil)
   - Recomendación: incluir ambos como sección breve

2. **¿IMC y categorías deben guardarse en la BD de nota médica?**
   - En exploración física SÍ se guardan (indiceMasaCorporal, categoriaIMC)
   - Recomendación: SÍ guardar también en nota médica para el PDF y para consultas rápidas
   - Campos adicionales opcionales: indiceMasaCorporal, categoriaIMC, categoriaCircunferenciaCintura

3. **¿Debe genero tener un default derivado del sexo del trabajador?**
   - El mapper CEX actualmente deriva genero de sexoCURP
   - Recomendación: en el frontend, pre-seleccionar genero basado en trabajador.sexo (Masculino→1, Femenino→2) pero permitir cambio

## Sources

### Primary (HIGH confidence)
- `nota-medica.schema.ts` — Schema Mongoose verificado, 165 líneas, 0 de los 8 campos existen
- `create-nota-medica.dto.ts` — DTO verificado, 207 líneas, patrón ValidateIf confirmado
- `cex.mapper.ts` — Mapper CEX verificado, 525 líneas, 8 campos con hardcoded defaults confirmados
- `FormStepper.vue` — Configuración de steps verificada, 11 steps nota médica confirmados
- `formDataStore.ts` — Store verificado, ref({}) sin tipo, no requiere cambios
- `Step5.vue` (notaMedicaSteps) — Patrón "Se desconoce" verificado
- `exploracionFisicaSteps/Step2.vue` — Patrón somatometría verificado
- `nota-medica.informe.ts` — PDF generation verificada, interface sin los 8 campos
- `validacionCampos.ts` — Validación pre-submit verificada, paso 5 hardcoded
- `Step6.spec.ts` — Patrón de tests verificado

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no se necesitan nuevas dependencias
- Architecture: HIGH — patrones idénticos ya existen en el codebase para signos vitales y somatometría
- Pitfalls: HIGH — verificados directamente en el código fuente
- CEX Mapper: HIGH — todos los 8 campos identificados con sus valores hardcoded exactos

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stack estable, sin cambios esperados)
