---
phase: 07-campos-cex-nota-medica
plan: 02
subsystem: frontend
tags: [vue, nota-medica, sires, nom024, cex, steps, formstepper]
dependency-graph:
  requires: [07-01]
  provides: [frontend-nota-medica-14-steps, sires-conditional-steps, somatometria-step, glucemia-step, genero-derechohabiencia-step]
  affects: [07-03]
tech-stack:
  added: []
  patterns: [conditional-step-array, dynamic-step-map, se-desconoce-checkbox]
key-files:
  created:
    - frontend/src/components/steps/notaMedicaSteps/Step3.vue
    - frontend/src/components/steps/notaMedicaSteps/Step7.vue
    - frontend/src/components/steps/notaMedicaSteps/Step8.vue
  modified:
    - frontend/src/components/steps/notaMedicaSteps/Step4.vue (renamed from Step3)
    - frontend/src/components/steps/notaMedicaSteps/Step5.vue (renamed from Step4)
    - frontend/src/components/steps/notaMedicaSteps/Step6.vue (renamed from Step5)
    - frontend/src/components/steps/notaMedicaSteps/Step9.vue (renamed from Step6)
    - frontend/src/components/steps/notaMedicaSteps/Step9.spec.ts (renamed from Step6.spec.ts)
    - frontend/src/components/steps/notaMedicaSteps/Step10.vue (renamed from Step7)
    - frontend/src/components/steps/notaMedicaSteps/Step11.vue (renamed from Step8)
    - frontend/src/components/steps/notaMedicaSteps/Step12.vue (renamed from Step9)
    - frontend/src/components/steps/notaMedicaSteps/Step13.vue (renamed from Step10)
    - frontend/src/components/steps/notaMedicaSteps/Step14.vue (renamed from Step11)
    - frontend/src/components/steps/FormStepper.vue
    - frontend/src/components/steps/VisualizadorNotaMedica.vue
    - frontend/src/helpers/validacionCampos.ts
decisions:
  - id: D-0702-01
    description: "Steps renumbered high-to-low via git mv to avoid filename conflicts"
  - id: D-0702-02
    description: "Conditional step array in FormStepper follows examenVista pattern; showSiresUI computed"
  - id: D-0702-03
    description: "VisualizadorNotaMedica uses computed stepMap for dynamic step numbers"
  - id: D-0702-04
    description: "validacionCampos receives isSIRES boolean for dynamic paso references"
metrics:
  duration: ~15min
  completed: 2026-03-17
---

# Phase 7 Plan 02: Frontend Steps y FormStepper Summary

**One-liner:** 3 nuevos steps SIRES (Género/Derechohabiencia, Somatometría, Glucemia), renumeración 11→14, FormStepper condicional, visualizador dinámico.

## What Was Done

### Task 1: Renumerar steps existentes y crear 3 nuevos steps (fbf10a4)

**Renaming (git mv, high-to-low):**
- Step11→Step14, Step10→Step13, Step9→Step12, Step8→Step11, Step7→Step10
- Step6→Step9, Step6.spec.ts→Step9.spec.ts, Step5→Step6, Step4→Step5, Step3→Step4

**New Steps Created:**
- **Step3.vue (Género y Derechohabiencia):** Select para género (8 opciones CEX), checkboxes múltiples para derechohabiencia (12 opciones con exclusividad para 0/1/99), pre-selección de género desde trabajador.sexo, formato `&`-separado.
- **Step7.vue (Somatometría):** Peso (1-400kg), talla (30-220cm), circunferencia cintura (20-300cm), IMC automático (talla cm→m), categorías IMC y cintura por género. Checkboxes "Se desconoce" (999/999/0).
- **Step8.vue (Glucemia):** Glucemia (20-999 mg/dl), checkbox "Se desconoce" (=0), campos condicionales tipoMedicion y resultadoObtenidoaTravesde (solo visibles si glucemia≠0).

**Verification:** 14 Step*.vue files + Step9.spec.ts exist.

### Task 2: FormStepper, Visualizador, validación (99095c8)

**FormStepper.vue:**
- 14 imports (Step1-Step14NotaMedica)
- Construcción condicional de steps array:
  - SIRES_NOM024: 14 steps (Step3 Género, Step7 Somatometría, Step8 Glucemia incluidos)
  - SIN_REGIMEN: 11 steps (idéntico al comportamiento anterior)
- Sigue patrón de `examenVista` con `showSiresUI.value`

**VisualizadorNotaMedica.vue:**
- Import `useNom024Fields` para `isSIRES`
- Computed `stepMap` que retorna step numbers dinámicos según régimen
- 3 nuevas secciones SIRES (Género, Somatometría, Glucemia) con `v-if="isSIRES"`
- Todos los `goToStep(N)` y `steps.currentStep === N` actualizados a usar `stepMap`

**validacionCampos.ts:**
- `validarNotaMedicaPreSubmit`: acepta `isSIRES` param, paso sistólica/diastólica: `isSIRES ? 6 : 5`
- `validarNotaMedicaCIEExact4Chars`: acepta `isSIRES` param, pasos diagnóstico/causa: `isSIRES ? 9 : 6`, diagnóstico 3: `isSIRES ? 11 : 8`

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0702-01 | git mv high-to-low | Avoid filename conflicts during sequential rename |
| D-0702-02 | showSiresUI for conditional steps | Follows existing examenVista pattern in FormStepper |
| D-0702-03 | Computed stepMap in visualizer | Clean mapping of sections to dynamic step numbers |
| D-0702-04 | isSIRES param in validation functions | Minimal change to existing functions, no refactor needed |

## Next Phase Readiness

Plan 07-03 (mapeo CEX/PDF) can proceed. The 8 CEX fields are now captured in the frontend and saved to `formDataNotaMedica`. Backend schema (07-01) should already have the fields. 07-03 will map them to CEX export and PDF sections.
