# Roadmap — Milestone SIRES_NOM024

**Project:** Ramazzini  
**Milestone:** Features exclusivas SIRES_NOM024 — prioridad exportación GIIS.

---

## Phase 1: Exportación GIIS (3 guías aplicables)

**Goal:** Que un proveedor SIRES pueda exportar la información según las 3 guías GIIS aplicables (formato y reglas correctos, salida usable por el ecosistema regulatorio).

**Requirements:** GIIS-01

**Success criteria:**
1. Identificación y documentación de las 3 guías GIIS aplicables y sus formatos/campos.
2. Backend: generación de export(s) que cumplan cada guía (o un flujo unificado que cubra las 3).
3. Tenant SIRES puede disparar la exportación desde la UI (o API) y obtener archivos/formato válido.
4. Validación o pruebas que confirmen que la salida cumple las guías (tests existentes en `backend/test/nom024/` extendidos o cubiertos).

**Status:** Completed  
**Verification:** `phases/01-exportacion-giis/01-VERIFICATION.md` (passed, 2026-02-05)

---

## Phase 2: GIIS — Validación externa y entrega regulatoria

**Goal:** Que los archivos GIIS generados por el SIRES pasen validadores externos y estén listos para carga regulatoria (SINBA u otros).

**Depends on:** Phase 1

**Status:** Completed  
**Verification:** `phases/02-giis-validacion-externa-y-entrega-regulatoria/02-VERIFICATION.md` (passed, 2026-02-05)

**Plans:** 3 plans (02-01, 02-02, 02-03)

Plans:
- [x] 02-01 — 2A: Validación profunda (pre-validación, skip row, Reporte de Excluidos, bloqueantes vs warnings)
- [x] 02-02 — 2B: Naming oficial, 3DES/.CIF, ZIP, advertencia 9998
- [x] 02-03 — 2C: Auditoría por evento, versionado/reintentos, retención documentada

**Details:**

Subfases (separadas):

- **Phase 2A — Validación profunda por campo**
  - Implementar reglas exactas de validación del diccionario: defaults vs vacío, rangos, longitudes, catálogos.
  - Reporte de errores estructurado: guía, renglón, campo, causa.
  - Decisión explícita: fail fast vs skip row.
  - Aquí se cumple el cumplimiento fino; bien separada de export.

- **Phase 2B — Cifrado y empaquetado**
  - Implementar: 3DES, .CIF, .ZIP.
  - Soportar: módulo DGIS o wrapper compatible.
  - Naming oficial de archivos.

- **Phase 2C — Operación y auditoría**
  - Versionado de batches.
  - Reintentos.
  - Retención / limpieza.
  - Evidencia para auditoría (quién, cuándo, con qué reglas).

---

## Phase 3: UI SIRES — Generación de informes GIIS

**Goal:** UI para que el proveedor SIRES genere y obtenga informes GIIS: elegir período, disparar generación, ver estado y descargar CDT/CEX/LES (apoyado en Phase 1 y 2).
**Depends on:** Phase 2
**Plans:** 2 plans (03-01, 03-02)

Plans:
- [x] 03-01 — Backend: listar batches GIIS del proveedor (GET /giis-export/batches)
- [x] 03-02 — Frontend: menú, ruta y vista Exportación GIIS (LayOut, ExportacionGiisView)

**Status:** Completed  
**Verification:** `phases/03-ui-sires-generacion-informes-giis/03-VERIFICATION.md` (passed, 2026-02-05)  
**UAT:** `phases/03-ui-sires-generacion-informes-giis/03-UAT.md` — 10/10 tests passed.

**Details:**
- Entrada en menú desplegable LayOut.vue, solo roles Principal/Administrador y proveedor SIRES. Nombre "Exportación GIIS". Descarga por archivo (CDT, CEX, LES), listado con mes, fecha, estado, errores y aviso 9998. Un job a la vez. Context: `phases/03-ui-sires-generacion-informes-giis/CONTEXT.md`.

---

## Phase 4: AuditTrail

**Goal:** Objetivo normativo (NOM-024, no negociable): registro cronológico, trazabilidad/autoría inequívoca, capacidad de reconstrucción fiel a estados anteriores, inalterabilidad post-resguardo, y soporte a no repudio.

**Depends on:** Phase 3

**Status:** Completed  
**Verification:** Plans 04-01–04-07 executed; NOM-024 audit tests in `test/nom024/audit-*.nom024.spec.ts`.

**Plans:** 7 plans (capas 1–7)

Plans:
- [x] 04-01 — Cimientos (enums, contrato, hash canónico)
- [x] 04-02 — Modelos y datos (AuditEvent, proveedorSaludId, índices; document_versions removido)
- [x] 04-03 — Instrumentación (hooks, Clase 1/2, audit_outbox)
- [x] 04-04 — APIs de consulta y UI mínima de auditoría
- [x] 04-05 — Export verificable (incl. hashes)
- [x] 04-06 — Pruebas de aceptación NOM-024
- [x] 04-07 — Deuda diferida (DEFERRED.md)

**Details:**
Capas: 01 cimientos, 02 datos, 03 instrumentación, 04 API/UI, 05 export verificable, 06 pruebas, 07 deuda. Contexto y decisiones: `phases/04-audit-trail/CONTEXT.md`. Alcance diferido: `phases/04-audit-trail/DEFERRED.md`.

---

## Phase 5: Audit Trail — eventos de usuarios y perfiles firmantes

**Goal:** Extender el sistema de Audit Trail existente con el registro de eventos que la app ya efectúa: gestión de usuarios (creación/invitación, activación, suspensión, reactivación, eliminación, cambio de contraseña) y perfiles de firmantes de documentos clínicos (medicoFirmante, enfermeraFirmante, tecnicoFirmante — creación y actualización).

**Depends on:** Phase 4

**Plans:** 4 plans (05-01 a 05-04)

Plans:
- [x] 05-01 — Tipos de evento y clases de criticidad (actionType + CLASS_1)
- [x] 05-02 — Instrumentación eventos de usuarios (register, verify, toggle, delete, password)
- [x] 05-03 — Instrumentación eventos de firmantes (create/update en 3 módulos)
- [x] 05-04 — UI de auditoría: nuevos tipos y filtro opcional

**Status:** Completed  
**Verification:** `phases/05-audit-trail-eventos-usuarios-firmantes/05-VERIFICATION.md` (passed, 2026-02-09)

**Details:**
Contexto: `phases/05-audit-trail-eventos-usuarios-firmantes/05-CONTEXT.md`. Eventos de usuario: USER_INVITATION_SENT, USER_ACTIVATED, USER_SUSPENDED, USER_REACTIVATED, USER_DELETED, USER_PASSWORD_CHANGED. Eventos de firmante: SIGNER_PROFILE_CREATED, SIGNER_PROFILE_UPDATED (resourceType medicoFirmante | enfermeraFirmante | tecnicoFirmante). Payload sin contraseñas ni binarios de firma; actualización de firmante con before/after.

---

## Phase 6: Cifrado de informes GIIS (txt → .cif)

**Goal:** Cifrado automático de informes GIIS al completar batch; descarga TXT y ZIP (.CIF) disponibles; solo CEX y LES; sin gate GIIS_ENCRYPTION_VALIDATED.
**Depends on:** Phase 5
**Plans:** 2 plans (06-01, 06-02)

Plans:
- [x] 06-01 — Backend: Cifrado automático en completion, eliminar gate, mantener endpoints
- [x] 06-02 — Frontend: Etiquetas "CEX Cifrado", "CEX.txt", "LES Cifrado", "LES.txt"

**Status:** Completed  
**Verification:** `phases/06-cifrado-informes-giis-txt-a-cif/06-VERIFICATION.md` (passed, 2026-02-26)

**Details:**
Los informes GIIS que actualmente se generan en .txt deben cifrarse automáticamente (TXT + CIF + ZIP) al completar el batch. Usuario puede descargar TXT y ZIP por cada guía. Alcance: solo CEX y LES.

---

## Phase 7: Campos CEX en Nota Médica

**Goal:** Agregar 8 campos requeridos por la guía GIIS CEX a la creación/edición de nota médica (género, derechohabiencia, peso, talla, circunferencia de cintura, glucemia, tipo de medición, resultado obtenido a través de), organizados en 3 nuevos steps del formulario, con renumeración de steps existentes (11 → 14 steps).

**Depends on:** Phase 6

**Plans:** 3 plans (07-01, 07-02, 07-03) in 2 waves

Plans:
- [x] 07-01 — Backend: schema Mongoose + DTO validaciones (11 campos: 8 CEX + 3 calculados) [Wave 1]
- [x] 07-02 — Frontend: 3 nuevos steps (Género/Derechohabiencia, Somatometría, Glucemia) + renumeración 11→14 steps + FormStepper + validacionCampos [Wave 1]
- [x] 07-03 — Mapeo GIIS CEX (leer campos reales con fallback) + PDF (3 secciones nuevas) [Wave 2, depends: 07-01]

**Status:** Completed  
**Verification:** `phases/07-campos-cex-nota-medica/07-VERIFICATION.md` (passed, 2026-03-17)

**Details:**
Campos CEX: genero (id 22), derechohabiencia (id 23), peso (id 26), talla (id 27), circunferenciaCintura (id 28), glucemia (id 35), tipoMedicion (id 36), resultadoObtenidoaTravesde (id 37). Nuevos steps: Step3 (Género/Derechohabiencia), Step7 (Somatometría — replica patrón de `exploracionFisicaSteps/Step2.vue`), Step8 (Glucemia). Contexto: `phases/07-campos-cex-nota-medica/CONTEXT.md`.

---

## Summary

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Exportación GIIS | Export según 3 guías GIIS para proveedor SIRES | GIIS-01 | Completed ✓ |
| 2 | GIIS validación externa y entrega regulatoria | Archivos GIIS pasan validadores y listos para SINBA/regulatorio | — | Completed ✓ |
| 3 | UI SIRES — Generación de informes GIIS | UI generar/descargar informes GIIS (menú, listado, descargas) | — | Completed ✓ |
| 4 | AuditTrail | Registro cronológico NOM-024, trazabilidad, no repudio, inalterabilidad | — | Completed ✓ |
| 5 | Audit Trail — eventos usuarios y firmantes | Registro de eventos de gestión de usuarios y perfiles firmantes | — | Completed ✓ |
| 6 | Cifrado de informes GIIS (txt → .cif) | Cifrado automático, TXT+ZIP descarga, CEX/LES | — | Completed ✓ |
| 7 | Campos CEX en Nota Médica | 8 campos CEX (género, derechohabiencia, somatometría, glucemia) en nota médica | — | Completed ✓ |

**Total:** 7 phases | 2 requirements mapped ✓

---

---

*Last updated: 2026-03-17 — Phase 7 completed*
