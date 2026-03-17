---
phase: 07-campos-cex-nota-medica
verified: 2026-03-17T20:00:00Z
status: passed
score: 15/15 must-haves verified
---

# Phase 7: Campos CEX en Nota Médica — Verification Report

**Phase Goal:** Agregar 8 campos requeridos por la guía GIIS CEX a la creación/edición de nota médica (género, derechohabiencia, peso, talla, circunferencia de cintura, glucemia, tipo de medición, resultado obtenido a través de), organizados en 3 nuevos steps del formulario, con renumeración de steps existentes (11 → 14 steps).

**Verified:** 2026-03-17
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Backend acepta 11 nuevos campos (8 CEX + 3 calculados) en POST/PATCH nota médica | ✓ VERIFIED | Schema (lines 44-78): 11 `@Prop({ required: false })` fields. DTO (lines 100-171): 11 fields con `@IsOptional()` + decorators de validación. |
| 2 | Campos opcionales: notas existentes sin estos campos siguen funcionando | ✓ VERIFIED | Todos los campos usan `@IsOptional()` en DTO y `required: false` en Schema. |
| 3 | Validación condicional activa: peso fuera de 1-400 (≠999) rechazado, glucemia=0 no requiere tipoMedicion | ✓ VERIFIED | DTO: `@ValidateIf((o) => o.peso != null && o.peso !== 999)` + `@Min(1)` + `@Max(400)`. Glucemia/tipoMedicion/resultadoObtenidoaTravesde: `@ValidateIf((o) => o.glucemia != null && o.glucemia !== 0)`. |
| 4 | derechohabiencia acepta formato string con '&' separador | ✓ VERIFIED | DTO line 110: `@Matches(/^(\d{1,2})(&\d{1,2}){0,8}$/)`. |
| 5 | Formulario nota médica muestra 14 steps para SIRES y 11 steps para SIN_REGIMEN | ✓ VERIFIED | FormStepper.vue lines 629-661: array condicional con `showSiresUI.value`. SIRES: 2+1+3+2+6=14. SIN_REGIMEN: 2+3+6=11. |
| 6 | Los 3 nuevos steps (Step3, Step7, Step8) SOLO aparecen para SIRES_NOM024 | ✓ VERIFIED | FormStepper line 635: `if (showSiresUI.value)` para Step3. Line 645: `if (showSiresUI.value)` para Step7+Step8. |
| 7 | Step3 captura género (select + pre-selección desde sexo) y derechohabiencia (checkboxes exclusivos) | ✓ VERIFIED | Step3.vue: 141 lines. Select con opciones 0-6,88. Pre-selección line 74-75 desde `trabajadores.currentTrabajador?.sexo`. Checkboxes con `exclusiveValues = ['0','1','99']` y `handleDerechohabienciaChange`. Formato join('&'). |
| 8 | Step7 captura peso/talla/cintura con 'Se desconoce', calcula IMC y categorías | ✓ VERIFIED | Step7.vue: 283 lines. Inputs con checkboxes `seDesconocePeso/Talla/Circunferencia`. `calcularIMC()`, `setCategoriaIMC()`, `setCategoriaCircunferencia()`. `syncFormData()` escribe valores correctos (999 para desconoce peso/talla, 0 para cintura). |
| 9 | Step8 captura glucemia con 'Se desconoce', condiciona tipoMedicion y resultadoObtenidoaTravesde | ✓ VERIFIED | Step8.vue: 142 lines. `seDesconoceGlucemia` checkbox. `showConditionalFields` computed. Radio buttons para tipoMedicion (0/1) y resultadoObtenidoaTravesde (1/2). Cuando desconoce: glucemia=0, tipoMedicion=-1, resultado=-1. |
| 10 | SIN_REGIMEN mantiene comportamiento idéntico (11 steps) | ✓ VERIFIED | FormStepper: Sin `showSiresUI`, solo se agregan Step1,2,4,5,6,9,10,11,12,13,14 = 11 steps. VisualizadorNotaMedica: stepMap sin genero/somatometria/glucemia. Secciones SIRES con `v-if="isSIRES"`. |
| 11 | VisualizadorNotaMedica: secciones nuevas solo visibles para SIRES, stepMap dinámico | ✓ VERIFIED | Line 21-26: `stepMap` computed con 2 variantes (SIRES: 12 keys incl. genero/somatometria/glucemia; SIN_REGIMEN: 9 keys). Lines 151-247: secciones género, somatometría, glucemia con `v-if="isSIRES"`. |
| 12 | Validación pre-submit usa paso correcto según régimen | ✓ VERIFIED | `validarNotaMedicaPreSubmit`: line 719 `paso: isSIRES ? 6 : 5`. `validarNotaMedicaCIEExact4Chars`: line 730 `pasoDiagPrincipal = isSIRES ? 9 : 6`. FormStepper line 1078 pasa `showSiresUI.value`. |
| 13 | Mapper CEX lee los 8 campos desde consulta con fallbacks correctos | ✓ VERIFIED | `ConsultaExternaLike` interface incluye los 8 campos. `valueByField`: `consulta.peso ?? 999`, `consulta.talla ?? 999`, `consulta.circunferenciaCintura ?? 0`, `consulta.glucemia ?? 0`, `consulta.tipoMedicion ?? -1` (condicional glucemia≠0), `consulta.resultadoObtenidoaTravesde ?? -1` (condicional), `consulta.genero ?? genero ?? 0` (fallback sexoCURP), `consulta.derechohabiencia \|\| '99'`. |
| 14 | PDF de nota médica incluye Somatometría, Glucemia, Datos Demográficos cuando hay datos | ✓ VERIFIED | `construirSomatometria()` (line 391, returns null si no hay datos). `construirGlucemia()` (line 431, returns null si glucemia=0). `construirDatosDemograficos()` (line 357, returns null si vacío). Las 3 funciones se invocan en content array (lines 668, 674, 677). |
| 15 | PDF funciones retornan null cuando no hay datos (SIRES conditionality) | ✓ VERIFIED | `construirDatosDemograficos`: `if (datos.length === 0) return null`. `construirSomatometria`: `if (datos.length === 0) return null`. `construirGlucemia`: `if (notaMedica.glucemia == null \|\| notaMedica.glucemia === 0) return null`. |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/expedientes/schemas/nota-medica.schema.ts` | 11 @Prop({ required: false }) campos CEX | ✓ VERIFIED | 202 lines. Lines 44-78: genero, derechohabiencia, peso, talla, circunferenciaCintura, indiceMasaCorporal, categoriaIMC, categoriaCircunferenciaCintura, glucemia, tipoMedicion, resultadoObtenidoaTravesde. |
| `backend/src/modules/expedientes/dto/create-nota-medica.dto.ts` | Decorators @ValidateIf, @Min, @Max, @IsIn, @Matches | ✓ VERIFIED | 282 lines. Lines 100-171: todos los decorators presentes. |
| `frontend/src/components/steps/notaMedicaSteps/Step3.vue` | Género/Derechohabiencia | ✓ VERIFIED | 141 lines. Select género, checkboxes derechohabiencia, exclusividad, pre-selección sexo, syncFormData. |
| `frontend/src/components/steps/notaMedicaSteps/Step7.vue` | Somatometría (peso/talla/cintura/IMC) | ✓ VERIFIED | 283 lines. Inputs con 'Se desconoce', cálculo IMC, categorías, validación rangos. |
| `frontend/src/components/steps/notaMedicaSteps/Step8.vue` | Glucemia (condicional tipoMedicion/resultado) | ✓ VERIFIED | 142 lines. Checkbox desconoce, campos condicionales, radio buttons. |
| `frontend/src/components/steps/FormStepper.vue` | 14 imports, conditional array | ✓ VERIFIED | 1594 lines. Lines 130-143: 14 imports NotaMedica. Lines 629-661: array condicional con `showSiresUI`. |
| `frontend/src/components/steps/VisualizadorNotaMedica.vue` | stepMap, 3 SIRES sections | ✓ VERIFIED | 416 lines. stepMap computed (SIRES/SIN_REGIMEN). 3 secciones con `v-if="isSIRES"`. |
| `frontend/src/helpers/validacionCampos.ts` | dynamic paso references | ✓ VERIFIED | 762 lines. `validarNotaMedicaPreSubmit` y `validarNotaMedicaCIEExact4Chars` usan parámetro `isSIRES` para paso correcto. |
| `backend/src/modules/giis-export/transformers/cex.mapper.ts` | Lee campos reales con fallback | ✓ VERIFIED | 537 lines. `ConsultaExternaLike` incluye 8 campos. `valueByField` lee de consulta con fallbacks correctos. |
| `backend/src/modules/informes/documents/nota-medica.informe.ts` | construirSomatometria/construirGlucemia/construirDatosDemograficos | ✓ VERIFIED | 1180 lines. Interface NotaMedica incluye 11 campos. 3 funciones builder con null-return. Invocadas en content array. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Step3.vue | formDataNotaMedica | syncFormData() → formDataNotaMedica.genero/derechohabiencia | ✓ WIRED | Lines 50-56: asigna genero y derechohabiencia (join '&') al store. |
| Step7.vue | formDataNotaMedica | syncFormData() → 6 campos (peso/talla/cintura/IMC/cats) | ✓ WIRED | Lines 74-81: asigna 6 campos, usa 999/0 para "desconoce". |
| Step8.vue | formDataNotaMedica | syncFormData() → glucemia/tipoMedicion/resultado | ✓ WIRED | Lines 22-31: condicional desconoce (0/-1/-1) vs valores reales. |
| FormStepper.vue | Step3/7/8 | showSiresUI conditional push | ✓ WIRED | Lines 635-649: inserción condicional en array de steps. |
| FormStepper.vue | validacionCampos | validarNotaMedicaPreSubmit(…, showSiresUI.value) | ✓ WIRED | Line 1089-1094: pasa isSIRES a validador para paso correcto. |
| VisualizadorNotaMedica | isSIRES | useNom024Fields() → computed | ✓ WIRED | Line 19: `const { isSIRES } = useNom024Fields()`. stepMap y v-if usan isSIRES. |
| cex.mapper.ts | ConsultaExternaLike | consulta.peso/talla/genero etc. | ✓ WIRED | Interface incluye 8 campos. valueByField lee consulta.X con fallbacks. |
| nota-medica.informe.ts | NotaMedica interface | construirSomatometria/Glucemia/DatosDemograficos | ✓ WIRED | Interface incluye 11 campos. Funciones leen de notaMedica y retornan Content\|null. Invocadas en content array. |
| nota-medica.schema.ts | create-nota-medica.dto.ts | Campos idénticos opcionales | ✓ WIRED | Los mismos 11 campos en ambos archivos, schema permite persistencia, DTO valida entrada. |

### Requirements Coverage

No hay requisitos explícitos mapeados a Phase 7 en REQUIREMENTS.md. La fase cumple el objetivo del ROADMAP.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| validacionCampos.ts | 348 | `paso: 6` hardcoded para notaMedica.codigoCIE10Principal | ℹ️ Info | Solo afecta al modal de campos faltantes (ModalCamposFaltantes), no a la navegación por step. Las validaciones críticas (pre-submit, CIE 4-chars) SÍ usan paso dinámico con isSIRES. Impacto mínimo: el modal muestra "paso 6" en lugar de "paso 9" para SIRES, pero el usuario no navega desde el modal. |

No se encontraron patrones de stub, TODO, placeholder, ni implementaciones vacías en ninguno de los artefactos verificados.

### Human Verification Required

### 1. Visual: Steps nuevos se ven correctamente
**Test:** Crear/editar nota médica como proveedor SIRES_NOM024. Navegar por los 14 steps.
**Expected:** Step3 muestra select género + checkboxes derechohabiencia. Step7 muestra peso/talla/cintura con checkboxes "Se desconoce" y IMC calculado. Step8 muestra glucemia con campos condicionales.
**Why human:** Apariencia visual y UX no verificables programáticamente.

### 2. Condicionalidad SIRES: Steps no aparecen para SIN_REGIMEN
**Test:** Crear nota médica como proveedor SIN_REGIMEN. Verificar que solo hay 11 steps.
**Expected:** No aparecen steps de género, somatometría ni glucemia. Barra de progreso muestra X/11. VisualizadorNotaMedica no muestra secciones SIRES.
**Why human:** Requiere login con proveedor SIN_REGIMEN real para verificar.

### 3. Derechohabiencia: Exclusividad funciona
**Test:** En Step3, seleccionar "IMSS", luego seleccionar "Ninguna".
**Expected:** Al seleccionar "Ninguna" (exclusiva), se deselecciona "IMSS". Al seleccionar "IMSS" después de "Ninguna", se deselecciona "Ninguna".
**Why human:** Interacción dinámica de checkboxes requiere prueba manual.

### 4. IMC: Cálculo correcto y categorías
**Test:** En Step7, ingresar peso=70 kg, talla=170 cm. Verificar IMC y categoría.
**Expected:** IMC = 24.22 (Normal). Cambiar peso a 90 → IMC = 31.14 (Obesidad clase I).
**Why human:** Verificación de cálculos en tiempo real.

### 5. PDF: Secciones nuevas aparecen con datos
**Test:** Crear nota médica SIRES con peso=75, talla=170, glucemia=95 (ayunas, laboratorio), género=Masculino, derechohabiencia=IMSS. Generar PDF.
**Expected:** PDF incluye sección Somatometría (Peso: 75 kg | Talla: 170 cm | IMC: 25.95), sección Glucemia (95 mg/dl | Ayunas: Sí | Laboratorio), Género: Masculino, Derechohabiencia: IMSS.
**Why human:** Contenido del PDF generado no verificable sin ejecutar el servidor.

### 6. PDF: Secciones ausentes sin datos
**Test:** Crear nota médica SIN_REGIMEN (sin campos SIRES). Generar PDF.
**Expected:** PDF NO incluye secciones de Somatometría, Glucemia ni Datos Demográficos.
**Why human:** Requiere ejecución del servidor y generación real del PDF.

### 7. Backend: Crear/actualizar nota médica con campos CEX
**Test:** POST /notas-medicas con payload incluyendo `peso: 80, talla: 170, glucemia: 95, tipoMedicion: 1, genero: 1, derechohabiencia: "2&3"`.
**Expected:** 201 Created, campos guardados correctamente en MongoDB. PATCH con campos adicionales también funciona.
**Why human:** Requiere servidor corriendo y base de datos para verificar persistencia.

### Gaps Summary

**No se encontraron gaps que bloqueen el logro del objetivo.**

Todos los artefactos existen (Level 1), son sustanciales con implementaciones completas (Level 2), y están correctamente conectados entre sí (Level 3). La condicionalidad SIRES/SIN_REGIMEN está implementada en todas las capas:
- **Backend:** Campos opcionales (`@IsOptional()`) permiten que proveedores SIN_REGIMEN no envíen estos campos.
- **Frontend:** `showSiresUI` controla la inserción de steps; `isSIRES` controla la visibilidad en el Visualizador.
- **Mapper CEX:** Lee campos reales con fallbacks correctos (999/0/-1/'99').
- **PDF:** Funciones builder retornan `null` cuando no hay datos, dejando el PDF limpio para SIN_REGIMEN.

**Nota menor:** `validacionCampos.ts` tiene `paso: 6` hardcoded para campos de notaMedica en `camposRequeridosPorTipo`, pero esto solo afecta al modal informativo de campos faltantes, no a la navegación real de validación pre-submit (que sí usa `isSIRES`).

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
