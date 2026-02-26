---
phase: "06"
plan: "01"
subsystem: giis-export
tags: [giis, cifrado, nom024, batch, zip]
requires: [02]
provides: [cifrado-automatico, sin-gate]
affects: []
tech-stack:
  added: []
  patterns: [encrypt-on-completion]
key-files:
  created: []
  modified:
    - src/modules/giis-export/giis-batch.service.ts
    - src/modules/giis-export/giis-export.controller.ts
    - test/nom024/giis-batch.nom024.spec.ts
    - test/nom024/giis-export-api.nom024.spec.ts
decisions: []
metrics:
  duration: null
  completed: "2026-02-26"
---

# Phase 06 Plan 01: Backend — Cifrado automático y eliminación del gate — Summary

**One-liner:** Integración del cifrado TXT→CIF→ZIP en el flujo de finalización del batch; eliminación del gate GIIS_ENCRYPTION_VALIDATED; endpoint build-deliverable como fallback.

---

## Completed Tasks

| Task | Description | Commit |
|------|-------------|--------|
| 06-01.0 | Extraer lógica a método privado `encryptAndZipArtifacts` | 12d4e5e |
| 06-01.1 | Integrar cifrado en flujo completion (generateBatchCex, generateBatchLes) | 12d4e5e |
| 06-01.2 | Eliminar gate GIIS_ENCRYPTION_VALIDATED | d606538 |
| 06-01.3 | build-deliverable como fallback; mensaje download-deliverable | d606538 |
| 06-01.4 | Tests: cifrado automático, sin gate, download | 1a11b61 |

---

## Implementation Details

### encryptAndZipArtifacts(batchId)

- Método privado que lee TXT, cifra con 3DES, escribe CIF y ZIP, actualiza `artifact.zipPath` y `hashSha256`.
- Valida: batch existe, status `completed` o `generating`, `validationStatus !== 'has_blockers'`.
- Omite artifacts que ya tienen `zipPath` (idempotente).
- Requiere `GIIS_3DES_KEY_BASE64` (24 bytes base64); si falta, lanza `ConflictException`.

### Integración en completion

- **generateBatchCex:** Tras el `updateOne` que deja el batch en `completed` (isFirstGenerator), si hay al menos 1 artifact sin `zipPath`, llama a `encryptAndZipArtifacts`.
- **generateBatchLes:** Tras añadir artifact LES, si el batch está `completed` y algún artifact no tiene `zipPath`, llama a `encryptAndZipArtifacts` antes de `recordBatchCompletionAudit`.

### buildDeliverable (fallback)

- Delega en `encryptAndZipArtifacts` solo si algún artifact carece de `zipPath`.
- Compatible con reintentos manuales.

### download-deliverable

- Mensaje de error actualizado: `No existe entregable ZIP para la guía {guide}.` (sin referencias a build-deliverable).

---

## Deviations from Plan

**None.** Plan executed as written.

---

## Verification

- Batch completado (CEX+LES) sin bloqueantes → artifacts con `path`, `zipPath`, `hashSha256`.
- `GET download/:guide` devuelve TXT.
- `GET download-deliverable/:guide` devuelve ZIP con .CIF dentro.
- No existe comprobación de `GIIS_ENCRYPTION_VALIDATED`.
- Tests pasan: `giis-batch.nom024.spec.ts`, `giis-export-api.nom024.spec.ts`.

---

## Next Phase Readiness

- Cifrado automático activo.
- Gate eliminado.
- Sin bloqueadores conocidos.
