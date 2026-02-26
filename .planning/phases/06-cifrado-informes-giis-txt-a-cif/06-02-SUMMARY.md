---
phase: "06"
plan: "02"
subsystem: giis-export
tags: [giis, frontend, cifrado, labels, cex, les]
requires: [06-01]
provides: [etiquetas-cex-les-cifrado-txt]
affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - backend: src/modules/giis-export/giis-batch.service.ts
    - frontend: src/api/giisExportAPI.ts
    - frontend: src/views/ExportacionGiisView.vue
decisions: []
metrics:
  duration: null
  completed: "2026-02-26"
---

# Phase 06 Plan 02: Frontend — Etiquetas CEX Cifrado, CEX.txt, LES Cifrado, LES.txt — Summary

**One-liner:** Vista Exportación GIIS con 4 enlaces de descarga (CEX Cifrado, CEX.txt, LES Cifrado, LES.txt); orden ZIP primero y TXT segundo; solo CEX y LES (sin CDT).

---

## Completed Tasks

| Task | Description | Commit |
|------|-------------|--------|
| 06-02.0 | Localizar vista Exportación GIIS | — (encontrada en `frontend/src/views/ExportacionGiisView.vue`) |
| 06-02.1 | Actualizar etiquetas y estructura de enlaces | 35ebe54 (frontend) |
| 06-02.2 | Filtrar artifacts a solo CEX y LES | 35ebe54 (frontend) |
| 06-02.3 | Verificación manual | Ver sección abajo |

---

## Implementation Details

### Backend (Rule 3 — Blocking)

- **giis-batch.service.ts:** Se extendió `BatchListItem.artifacts` con `path` y `zipPath` para que el frontend pueda mostrar los enlaces Cifrado y txt de forma condicional.
- Commit: aae9194 (backend).

### Frontend

- **giisExportAPI.ts**
  - Nuevo método `downloadDeliverable(batchId, guide)` → `GET api/giis-export/batches/:batchId/download-deliverable/:guide` (ZIP).
  - `downloadFile` mantiene `download/:guide` (TXT).
  - Interfaces `BatchListItem` y `BatchDetail` con `path?` y `zipPath?` en artifacts.

- **ExportacionGiisView.vue**
  - Filtro: `artifacts.filter(a => ['CEX','LES'].includes(a.guide))`.
  - Por cada artifact: enlace "CEX Cifrado" / "LES Cifrado" (visible si `artifact.zipPath`) → `downloadDeliverable`.
  - Enlace "CEX.txt" / "LES.txt" (visible si `artifact.path`) → `downloadFile`.
  - Orden: Cifrado primero, txt segundo por guía.
  - CDT eliminado (no se muestran enlaces).

---

## Deviations from Plan

- **[Rule 3 — Blocking]** El listado de batches del backend no incluía `path` ni `zipPath` en los artifacts. Sin esos campos el frontend no podía aplicar la visibilidad condicional. Se extendió `listBatchesForProveedor` para devolverlos.

---

## Verificación manual (Task 06-02.3)

1. Iniciar backend y frontend (proveedor SIRES, usuario Principal o Administrador).
2. Ir a la ruta `/exportacion-giis`.
3. Generar un batch (mes/año) o usar uno existente en estado "Listo".
4. En cada fila completada, verificar que aparecen en este orden: **CEX Cifrado**, **CEX.txt**, **LES Cifrado**, **LES.txt**.
5. Clic en "CEX Cifrado" → debe descargar un archivo ZIP con CEX-xxx.CIF dentro.
6. Clic en "CEX.txt" → debe descargar archivo TXT.
7. Idem para LES Cifrado y LES.txt.
8. No debe aparecer ningún enlace para CDT.

---

## Next Phase Readiness

- Etiquetas alineadas con 06-CONTEXT.md.
- Sin bloqueadores conocidos.
