# State — Ramazzini GSD

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-02-04)

**Core value:** Que un proveedor SIRES pueda exportar información según las 3 guías GIIS aplicables.  
**Current focus:** Phase 7 — Campos CEX en Nota Médica (8 campos: género, derechohabiencia, peso, talla, circunferencia cintura, glucemia, tipoMedicion, resultadoObtenidoaTravesde).

---

## Current Position

- **Milestone:** SIRES_NOM024 (features exclusivas para proveedores en régimen SIRES).
- **Roadmap:** 7 phases (Exportación GIIS → … → Campos CEX en Nota Médica). Ver ROADMAP.md.
- **Phase 7 Plan 01:** Completada (07-01 backend schema + DTO, 11 campos CEX). **SUMMARY:** `.planning/phases/07-campos-cex-nota-medica/07-01-SUMMARY.md`.
- **Phase 7 Plan 02:** Completada (07-02 frontend: 3 nuevos steps SIRES, renumeración 11→14, FormStepper condicional, visualizador dinámico, validación dinámica). **SUMMARY:** `.planning/phases/07-campos-cex-nota-medica/07-02-SUMMARY.md`.
- **Next:** Phase 7 Plan 03 — Mapeo CEX/PDF (Wave 2).
- **Phase 5:** Completada (05-01 enums, 05-02 usuarios, 05-03 firmantes, 05-04 UI). **Verification:** `05-VERIFICATION.md` (passed).
- **Phase 4:** Completada (04-01 cimientos … 04-07 deuda diferida). Tests NOM-024 en `test/nom024/audit-*.nom024.spec.ts`.
- **Phase 3:** Completada (03-01 list batches, 03-02 menú + vista Exportación GIIS). **Verification:** `03-VERIFICATION.md` (passed). **UAT:** `03-UAT.md` — 10/10 tests passed.
- **Phase 1:** Completada. Context: `.planning/phases/01-exportacion-giis/CONTEXT.md`. Planes 01-01 (1A) a 01-05 (1E). **Verification:** `01-VERIFICATION.md` (passed).
- **Phase 2:** Completada (02-01 validación profunda, 02-02 naming/cifrado/ZIP, 02-03 auditoría y retención). **Verification:** `02-VERIFICATION.md` (passed). Deuda no crítica documentada: validación 3DES con DGIS pendiente; job de limpieza opcional.
- **Phase 6 Plan 01:** Completada (06-01 cifrado automático, eliminación gate GIIS_ENCRYPTION_VALIDATED). **SUMMARY:** `.planning/phases/06-cifrado-informes-giis-txt-a-cif/06-01-SUMMARY.md`.
- **Phase 6 Plan 02:** Completada (06-02 frontend etiquetas CEX Cifrado, CEX.txt, LES Cifrado, LES.txt). **SUMMARY:** `.planning/phases/06-cifrado-informes-giis-txt-a-cif/06-02-SUMMARY.md`.

---

## Codebase Map

- `.planning/codebase/` — STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS.
- Módulos relevantes: `backend/src/modules/giis-export/`, `nom024-compliance/`, `consentimiento-diario/`; tests en `backend/test/nom024/`.

---

## Accumulated Context

### Roadmap Evolution

- Phase 2 added: GIIS — Validación externa y entrega regulatoria (subfases 2A validación por campo, 2B cifrado/empaquetado, 2C operación y auditoría). Audit Trail (antes Phase 2) eliminado del roadmap — retomado después.
- Phase 3 added: UI SIRES — Generación de informes GIIS.
- Phase 4 added: AuditTrail (NOM-024: registro cronológico, trazabilidad/autoría, reconstrucción de estados, inalterabilidad post-resguardo, no repudio).
- Phase 5 added: Audit Trail — eventos de usuarios y perfiles firmantes (gestión de usuarios y firmantes; detalles en fase de discusión).
- Phase 6 added: Cifrado de informes GIIS (txt → .cif) — informes .txt cifrados con extensión .cif, misma experiencia de descarga.
- Phase 7 added: Campos CEX en Nota Médica — 8 campos CEX (género, derechohabiencia, peso, talla, circunferencia cintura, glucemia, tipoMedicion, resultadoObtenidoaTravesde) agregados a la nota médica, con 3 nuevos steps en el formulario y renumeración de steps existentes (11 → 14).

---

## Key Decisions (summary)

- Cambio de régimen a SIRES sin exigencia retroactiva.
- Prioridad: exportación GIIS (3 guías) antes que Audit Trail.
- Phase 6: Cifrado obligatorio y automático al completar batch; gate GIIS_ENCRYPTION_VALIDATED eliminado.
- Phase 7: 8 campos CEX agrupados en 3 nuevos steps (Género/Derechohabiencia, Somatometría, Glucemia); steps existentes renumerados de 11 a 14. Step7 (Somatometría) replica patrón de `exploracionFisicaSteps/Step2.vue`. **SIRES-only:** los 3 nuevos steps solo se muestran para SIRES_NOM024; SIN_REGIMEN mantiene 11 steps idénticos. Género/derechohabiencia en PDF y visualizador. IMC/categorías guardadas en BD. Genero pre-seleccionado desde trabajador.sexo.

---

## Session Continuity

*(Para reanudar tras pausa: qué se estaba haciendo, qué archivos tocar, siguiente paso.)*

- Última sesión: 2026-03-17.
- Phase 7: Wave 1 completada (07-01 backend + 07-02 frontend). Wave 2 pendiente (07-03 mapeo CEX/PDF).
- Siguiente paso: Ejecutar 07-03-PLAN.md (Wave 2: mapeo CEX export + PDF nota médica).
- Contexto: `phases/07-campos-cex-nota-medica/CONTEXT.md`.
- Plans: `07-01-SUMMARY.md` ✅, `07-02-SUMMARY.md` ✅, `07-03-PLAN.md` pendiente.

---

*Last updated: 2026-03-17 — 07-02 complete (Wave 1 done)*
