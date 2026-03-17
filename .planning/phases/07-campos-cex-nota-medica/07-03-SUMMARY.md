---
phase: 07-campos-cex-nota-medica
plan: 03
subsystem: giis-export, informes
tags: [CEX, mapper, PDF, somatometria, glucemia, genero, derechohabiencia]
dependency-graph:
  requires: ["07-01"]
  provides: ["CEX mapper reads 8 fields from consulta", "PDF nota médica with somatometría/glucemia/demográficos sections"]
  affects: []
tech-stack:
  added: []
  patterns: ["conditional PDF sections with null return", "fallback chain in mapper valueByField"]
key-files:
  created: []
  modified:
    - backend/src/modules/giis-export/transformers/cex.mapper.ts
    - backend/src/modules/informes/documents/nota-medica.informe.ts
decisions:
  - id: D07-03-01
    description: "tipoMedicion y resultadoObtenidoaTravesde solo se reportan cuando glucemia tiene valor (!=null && !=0)"
  - id: D07-03-02
    description: "Orden en PDF: datosDemográficos → signosVitales → somatometría → glucemia"
  - id: D07-03-03
    description: "derechohabiencia usa || en lugar de ?? para que string vacío caiga al default '99'"
metrics:
  duration: ~4min
  completed: 2026-03-17
---

# Phase 7 Plan 3: CEX Mapper + PDF Nota Médica Summary

**One-liner:** Mapper CEX lee 8 campos desde consulta con fallbacks correctos; PDF nota médica muestra somatometría, glucemia y datos demográficos condicionalmente.

## What Was Done

### Task 1: Actualizar mapper CEX — interface y valueByField
- Extended `ConsultaExternaLike` interface con 8 campos opcionales: genero, derechohabiencia, peso, talla, circunferenciaCintura, glucemia, tipoMedicion, resultadoObtenidoaTravesde
- Actualizados los 8 campos en `valueByField` para leer de `consulta.X` con fallback apropiado:
  - `genero`: `consulta.genero ?? genero ?? 0` (prioridad: nota médica > CURP > 0)
  - `derechohabiencia`: `consulta.derechohabiencia || '99'` (|| para que vacío caiga a default)
  - `peso`: `consulta.peso ?? 999`
  - `talla`: `consulta.talla ?? 999`
  - `circunferenciaCintura`: `consulta.circunferenciaCintura ?? 0`
  - `glucemia`: `consulta.glucemia ?? 0`
  - `tipoMedicion`: condicional a glucemia presente → `consulta.tipoMedicion ?? -1`, sino -1
  - `resultadoObtenidoaTravesde`: condicional a glucemia presente → `consulta.resultadoObtenidoaTravesde ?? -1`, sino -1
- **Commit:** b3b19e2

### Task 2: Actualizar PDF — interface NotaMedica y secciones nuevas
- Extended interface `NotaMedica` con 11 campos opcionales (los 8 + indiceMasaCorporal, categoriaIMC, categoriaCircunferenciaCintura)
- Creadas 3 funciones de construcción PDF:
  - `construirDatosDemograficos()`: género con catálogo (1-6,88) y derechohabiencia con catálogo multi-valor (split por &)
  - `construirSomatometria()`: peso (!=999), talla (!=999), IMC con categoría, cintura con categoría
  - `construirGlucemia()`: valor mg/dl, tipo medición (ayunas sí/no), origen (laboratorio/tira capilar)
- Las 3 funciones retornan `null` cuando no hay datos (pdfmake ignora null en content[])
- Insertadas en content[]: demográficos antes de signos vitales, somatometría y glucemia después
- **Commit:** edbc5a1

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D07-03-01 | tipoMedicion/resultadoObtenidoaTravesde condicionados a glucemia | Sin glucemia, estos campos no tienen sentido clínico; enviar -1 |
| D07-03-02 | Orden PDF: demográficos → signos → somatometría → glucemia | Flujo lógico: identificación → vitales → medidas → laboratorio |
| D07-03-03 | derechohabiencia usa `\|\|` en lugar de `??` | String vacío debe caer al default '99' |

## Verification

- [x] TypeScript compila sin errores en ambos archivos
- [x] No quedan valores hardcoded solos para los 8 campos CEX (todos usan consulta.X ?? default)
- [x] 3 funciones nuevas existen en nota-medica.informe.ts
- [x] Interface NotaMedica tiene 11 campos nuevos
- [x] Funciones insertadas en content[] en orden correcto

## Next Phase Readiness

Phase 7 completada. Los 3 planes (07-01 schema/DTO, 07-02 frontend, 07-03 mapper/PDF) están finalizados.
No hay blockers pendientes ni deuda técnica relevante.
