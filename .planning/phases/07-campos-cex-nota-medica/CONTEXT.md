# Phase 7 — Campos CEX en Nota Médica

## Objetivo

Agregar 8 campos requeridos por la guía GIIS CEX (Consulta Externa) a la creación/edición de nota médica. Estos campos son necesarios para que la exportación GIIS CEX tenga datos completos en lugar de valores "desconocido" por defecto.

## Campos a agregar (CEX.schema.json)

| CEX ID | Campo | Descripción | Tipo | Rango / Opciones | Valor "desconoce" |
|--------|-------|-------------|------|-------------------|-------------------|
| 22 | `genero` | Identidad de género del paciente | numeric | 0=No especificado, 1=Masculino, 2=Femenino, 3=Transgénero, 4=Transexual, 5=Travesti, 6=Intersexual, 88=Otro | 0 |
| 23 | `derechohabiencia` | Afiliación a instituciones del SNS | string (max 20) | Catálogo AFILIACION: 0=No especificado, 1=Ninguna, 2=IMSS, 3=ISSSTE, 4=PEMEX, 5=SEDENA, 6=SEMAR, 8=Otra, 10=IMSS Bienestar, 11=ISSFAM, 14=OPD IMSS BIENESTAR, 99=Se ignora. Múltiple con "&". | "0" |
| 26 | `peso` | Peso del paciente (kg) | numeric | 1–400 kg, formato ###.### | 999 |
| 27 | `talla` | Talla del paciente (cm) | numeric | 30–220 cm, entero | 999 |
| 28 | `circunferenciaCintura` | Circunferencia de cintura (cm) | numeric | 20–300 cm, entero | 0 |
| 35 | `glucemia` | Glucosa en sangre (mg/dl) | numeric | 20–999, entero | 0 |
| 36 | `tipoMedicion` | ¿La glucosa fue en ayunas? | numeric | 0=No, 1=Sí. Solo si glucemia≠0 | -1 |
| 37 | `resultadoObtenidoaTravesde` | Origen del resultado de glucosa | numeric | 1=Laboratorio, 2=Tira de glucosa capilar. Solo si glucemia≠0 | -1 |

## Reglas de validación condicional

- **tipoMedicion**: Solo se captura si `glucemia` es diferente de 0; si glucemia=0 o se desconoce, se envía -1.
- **resultadoObtenidoaTravesde**: Solo se captura si `glucemia` es diferente de 0; si glucemia=0, se envía -1.
- **derechohabiencia**: Permite selección múltiple (hasta 9) separadas por "&". Si se selecciona "0" (No especificado), "1" (Ninguna) o "99" (Se ignora), no se permite combinar con otro valor. No se permite repetir un mismo valor.

## Distribución en steps del formulario

### Orden lógico clínico propuesto

Los campos se organizan en **3 nuevos steps** insertados según el orden de evaluación clínica:

| Step | Contenido | Justificación clínica |
|------|-----------|----------------------|
| **Step3** (NUEVO) | Género, Derechohabiencia | Datos demográficos/administrativos, se recopilan al inicio |
| **Step7** (NUEVO) | Peso, Talla, Circunferencia de Cintura | Somatometría, se toman después de signos vitales |
| **Step8** (NUEVO) | Glucemia, Tipo de Medición, Resultado obtenido a través de | Determinaciones de laboratorio/glucosa, se registran después de mediciones corporales |

### Mapa de renumeración de steps (11 → 14)

| Step nuevo | Contenido | Step original |
|------------|-----------|---------------|
| Step1 | Tipo de nota, fecha | Step1 (sin cambio) |
| Step2 | Motivo de consulta | Step2 (sin cambio) |
| **Step3** | **Género y Derechohabiencia** | **NUEVO** |
| Step4 | Antecedentes | Step3 → renombrado |
| Step5 | Exploración Física | Step4 → renombrado |
| Step6 | Signos Vitales | Step5 → renombrado |
| **Step7** | **Somatometría** | **NUEVO** |
| **Step8** | **Glucemia** | **NUEVO** |
| Step9 | Diagnóstico Principal | Step6 → renombrado |
| Step10 | Comorbilidad 2 | Step7 → renombrado |
| Step11 | Comorbilidad 3 | Step8 → renombrado |
| Step12 | Tratamiento | Step9 → renombrado |
| Step13 | Recomendaciones | Step10 → renombrado |
| Step14 | Observaciones | Step11 → renombrado |

## Archivos a modificar

### Backend
- `backend/src/modules/expedientes/schemas/nota-medica.schema.ts` — agregar 8 campos al schema Mongoose
- `backend/src/modules/expedientes/dto/create-nota-medica.dto.ts` — agregar validaciones DTO (class-validator)
- `backend/src/modules/expedientes/dto/update-nota-medica.dto.ts` — hereda automáticamente de CreateDto (PartialType)
- `backend/src/modules/informes/documents/nota-medica.informe.*` — actualizar PDF si aplica
- Mapeo GIIS CEX: verificar si `giis-export` ya lee estos campos de la nota médica o necesita actualizarse

### Frontend
- `frontend/src/components/steps/notaMedicaSteps/Step3.vue` → **crear nuevo** (Género y Derechohabiencia)
- `frontend/src/components/steps/notaMedicaSteps/Step7.vue` → **crear nuevo** (Somatometría — replicar `exploracionFisicaSteps/Step2.vue`)
- `frontend/src/components/steps/notaMedicaSteps/Step8.vue` → **crear nuevo** (Glucemia)
- Steps existentes 3–11 → renombrar a 4–6 y 9–14
- `frontend/src/components/steps/FormStepper.vue` — actualizar imports y array de steps (11 → 14)
- `frontend/src/stores/formDataStore.*` — verificar que formDataNotaMedica acepte los nuevos campos

## Patrón de implementación

### Step7 — Somatometría (referencia: `exploracionFisicaSteps/Step2.vue`)

El documento exploración física ya cuenta con un step de somatometría (`frontend/src/components/steps/exploracionFisicaSteps/Step2.vue`) que captura peso, altura, IMC, categoría IMC, circunferencia de cintura y categoría de circunferencia. La implementación del Step7 de nota médica debe **replicar ese patrón**, adaptando:

- **Store**: usar `formDataNotaMedica` en lugar de `formDataExploracionFisica`
- **Talla**: CEX usa centímetros (30–220 cm) vs exploración física usa metros (1.40–2.20 m). El step debe capturar en cm y el campo se llama `talla` (no `altura`).
- **Rangos CEX**: peso 1–400 kg (vs 45–200 en exploración), cintura 20–300 cm (vs 50–160 en exploración).
- **Checkbox "Se desconoce"**: agregar como en Step5 (signos vitales). CEX usa 999 para peso/talla desconocido y 0 para cintura desconocida.
- **IMC y categorías**: calcular automáticamente igual que en exploración física (convertir talla de cm a m para el cálculo).

### Step3 y Step8

Siguen el patrón general de Step5 (signos vitales):
- Refs locales con valores default
- Checkbox "Se desconoce" donde aplique
- Sincronización bidireccional con `formDataNotaMedica` via `watch` + `onUnmounted`
- Carga desde `documentos.currentDocument` o `formDataNotaMedica` en `onMounted`
- Validación de rangos CEX con `computed` para mensajes de error inline

## Condicionalidad SIRES_NOM024

**Regla fundamental (PROJECT.md):** Las features exclusivas SIRES solo se muestran y aplican cuando `regulatoryPolicy.regime === 'SIRES_NOM024'`. Los 8 campos CEX son una feature SIRES.

### Impacto en implementación

- **FormStepper.vue**: El array de steps de nota médica debe construirse condicionalmente:
  - `SIRES_NOM024`: 14 steps (incluye Step3 Género/Derechohabiencia, Step7 Somatometría, Step8 Glucemia)
  - `SIN_REGIMEN`: 11 steps (sin los 3 nuevos, comportamiento idéntico al actual)
  - Patrón existente: `examenVista` ya construye steps condicionalmente según `paisProveedor`
- **VisualizadorNotaMedica.vue**: Las 3 secciones nuevas solo visibles para SIRES (`v-if="isSIRES"`)
  - Los step numbers (`goToStep(N)`, `steps.currentStep === N`) deben ser dinámicos según régimen, ya que la posición de cada sección cambia (con SIRES antecedentes es paso 4, sin SIRES es paso 3)
- **Backend schema/DTO**: Los campos son siempre opcionales (`@IsOptional()`). Providers SIN_REGIMEN simplemente no los envían.
- **PDF (nota-medica.informe.ts)**: Las funciones `construir*` ya retornan `null` cuando no hay datos → sin datos = sin sección en PDF. No requiere condición SIRES explícita.
- **Mapper CEX (cex.mapper.ts)**: La exportación GIIS solo se ejecuta para providers SIRES → la lectura de campos del documento con fallbacks es suficiente. No requiere condición adicional.

### Composable disponible

`useNom024Fields()` en `frontend/src/composables/useNom024Fields.ts` expone:
- `isSIRES`: `computed(() => policy.value?.regime === 'SIRES_NOM024')`
- `isSinRegimen`: `computed(() => policy.value?.regime === 'SIN_REGIMEN')`

## Dependencias

- Phase 6 (completada): el cifrado de informes GIIS no se ve afectado; solo cambian los datos de entrada.
- Mapeo CEX en `giis-export`: ya referencia los 8 campos con defaults hardcoded; actualizar para leer del documento.

---

*Created: 2026-03-17*
*Updated: 2026-03-17 — Agregada sección condicionalidad SIRES_NOM024*
