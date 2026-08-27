# CHANGELOG-RAMAZZINI — Línea comercial / sin régimen SIRES

Registro de cambios de la **línea comercial** de Ramazzini (régimen `SIN_REGIMEN`). Este folio **no es SIRES** y **no es el objeto del trámite ni de la certificación**. Comparte el mismo código y el mismo ambiente que la línea 1.0; el aislamiento es por tenant. Los cambios de núcleo se referencian en cruz con [CHANGELOG-SIRES.md](CHANGELOG-SIRES.md). Índice de ambas líneas: [CHANGELOG.md](CHANGELOG.md).

---

## 1. Resumen de Versiones

**Versión vigente de la línea comercial:** `v2.0.0`

> Fuente de verdad del folio comercial (interfaz de tenants `SIN_REGIMEN`). Actualizar al liberar una versión nueva de esta línea, según la política de la **sección 3** (formato `vX.Y.Z`).


| VERSIÓN | FECHA      | DESCRIPCIÓN GENERAL                                                                                                                                 | TIPO  |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| v2.0.0  | Pendiente  | Primera emisión de la línea comercial (`SIN_REGIMEN`): folio propio `Ramazzini v2.0.0`, AuditTrail proporcional, acuerdo de confidencialidad, informe longitudinal audiométrico y núcleo compartido con SIRES v1.0.4. No es SIRES ni objeto de certificación. | Mayor |


---

## 2. Clasificación del Cambio

Previo a pruebas formales, el cambio se clasifica según la siguiente tabla:


| Tipo de Cambio                                                                                                 | Impacto    | Incremento de Versión |
| -------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- |
| Corrección de errores, mejoras de rendimiento, seguridad, UX o ampliaciones compatibles con el alcance vigente | Bajo/Medio | Parche (`vX.Y.Z+1`)   |
| Ampliación relevante del alcance funcional de esta línea                                                       | Alto       | Menor (`vX.Y+1.0`)    |
| Modificación significativa de arquitectura, alcance general o naturaleza del sistema                           | Muy alto   | Mayor (`vX+1.0.0`)    |


---

## 3. Reglas de Versionamiento

La línea comercial de Ramazzini utiliza un esquema de versionamiento compuesto por tres elementos numéricos en el formato **MAYOR.MENOR.PARCHE**.

**Ejemplo:** `v2.0.0`

Donde:

- **MAYOR** identifica cambios de gran alcance que modifican significativamente la naturaleza o arquitectura general del sistema.
- **MENOR** identifica ampliaciones relevantes del alcance funcional previamente liberado de esta línea.
- **PARCHE** identifica correcciones, mejoras o ampliaciones compatibles con el alcance de la versión vigente.

Las guías de intercambio GIIS / NOM-024 no abren por sí solas un incremento de esta línea. Si un cambio compartido de núcleo también afecta a `SIRES_NOM024`, se documenta en cruz en [CHANGELOG-SIRES.md](CHANGELOG-SIRES.md) (allí sí pueden aplicar reglas de guías DGIS/SSA).

### 3.1 Versiones de Parche (`vX.Y.x`)

Modificaciones que mantienen el alcance general de la línea comercial vigente:

- Correcciones de errores.
- Mejoras de rendimiento, seguridad o experiencia de usuario.
- Refactorización interna y optimización de procesos existentes.
- Incorporación de documentos, formularios, reportes, estadísticas o dashboards compatibles con el alcance vigente.
- Nuevos campos o validaciones de captura que no amplíen de forma relevante el alcance.

**Ejemplos:** `v2.0.1`, `v2.0.2`

### 3.2 Versiones Menores (`vX.Y.0`, con `Y ≥ 1`)

Cambios que amplían de manera relevante el alcance funcional de esta línea.

**Ejemplos:** `v2.1.0`, `v2.2.0`

### 3.3 Versiones Mayores (`vX.0.0`, con `X ≥ 3`)

Cambios que modifican de forma significativa la arquitectura, alcance general o naturaleza del sistema.

**Ejemplos:** `v3.0.0`

### 3.4 Versión vigente y despliegue

El valor **Versión vigente de la línea comercial** (sección 1) debe mantenerse alineado con lo desplegado para tenants `SIN_REGIMEN`. Al incrementar la versión, actualice ese campo, el resumen de versiones y el historial detallado.

### 3.5 Alcance de este registro frente a la línea SIRES

- Cambio solo de `SIN_REGIMEN` → solo este archivo.
- Cambio solo de features SIRES → solo [CHANGELOG-SIRES.md](CHANGELOG-SIRES.md).
- Cambio de núcleo compartido → **ambos** parches, misma fecha, referencia cruzada («mismo cambio de código, dos folios de edición»).

---

## 4. Registro y Trazabilidad

Para cada versión se documenta:

- Número de versión.
- Fecha de liberación.
- Descripción del cambio.
- Tipo de cambio.
- Evidencia de pruebas realizadas.
- Resultado de aceptación.
- Responsable de autorización.

El registro se conserva en archivo interno de control de versiones.

---

## 5. Historial Detallado


### v2.0.0 — Pendiente


| Campo                           | Valor                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**                 | Primera emisión de la línea comercial (`SIN_REGIMEN`). No es SIRES. No es el objeto del trámite ni de la certificación. Comparte el mismo código y el mismo ambiente que la línea SIRES **v1.0.4**; el folio exhibido es `Ramazzini v2.0.0`. **(1) Identidad de edición (frontend):** un solo binario resuelve el folio en runtime según `regimenRegulatorio`; `SIN_REGIMEN` exhibe **Ramazzini v2.0.0**; `SIRES_NOM024` exhibe **SIRES v1.0.n**; sin proveedor/régimen: «Ramazzini» sin número. Fuente: `CHANGELOG-RAMAZZINI.md` / `CHANGELOG-SIRES.md` vía `readProductVersion.ts`. **(2) AuditTrail proporcional (frontend/backend):** el mismo motor (`AuditService`, `auditevents`, consulta/export/verify) persiste eventos de funcionalidad compartida (auth, usuarios, permisos, empresa/centro, firmantes, transferencia/fusión, Excel trabajadores, dashboard, descargas clínicas, merger, `DOC_CREATE_DRAFT` / `DOC_UPDATE_DRAFT` / `DOC_FINALIZE` / `DOC_ANULATE`). Consulta restringida a rol Principal. Snapshot de `regime` en el evento (fuera del hash). GIIS, consentimiento SIRES, admin de catálogos y `ADMIN_CONFIG_SIRES` siguen exclusivos SIRES. Gate: `auditTrailEnabled` + `AUDIT_TRAIL_PERSIST`. **(3) Informe longitudinal audiométrico (frontend/backend):** nuevo documento clínico `informeLongitudinalAudiometrico` (patrón ILC, sin citas): basal y subsecuentes, audiogramas superpuestos, matriz Δ vs basal, resumen AMA/LFT por estudio, interpretación médica y PDF inmutable. Criterio v1 `solo_diferencias`. **(4) Núcleo compartido con SIRES v1.0.4:** ficha snapshot en PDFs, CURP inline con paridad FE/BE, nombres 2–50 y charset por régimen, edad/antigüedad anclada a la fecha del documento, somatometría/signos en EF y certificado expedito, geografía centros A3 y nacimiento/residencia, auditoría de egresos clínicos y merger, ValidationPipe, métricas de servidor, modo oscuro stepper V2, acceso a rutas clínicas legacy. **(5) Acuerdo de confidencialidad (frontend/backend):** el mismo módulo (`acuerdo-confidencialidad`, modal bloqueante, `ConfidentialityAgreementGuard`) se exige también en `SIN_REGIMEN`; `confidentialityAgreementEnabled` pasa a `true` en ambos regímenes. Registro append-only por usuario y versión vigente; re-aceptación si sube `ACUERDO_CONFIDENCIALIDAD.version`. Quien ya aceptó `v1` (p. ej. tras cambio de régimen) no vuelve a aceptar. Mismo cambio de código; el folio SIRES no cambia de alcance (ya lo exigía). Ver [CHANGELOG-SIRES.md](CHANGELOG-SIRES.md) v1.0.4. **No incluye** GIIS/CEX, inmutabilidad documental SIRES, `sexoCURP` obligatorio, tope de fecha SIRES, borradores de nota médica SIRES ni admin de catálogos SIRES. Mismo cambio de código, dos folios; ver [CHANGELOG-SIRES.md](CHANGELOG-SIRES.md) v1.0.4. |
| **Tipo de cambio**              | Mayor                                                                                                                                                                                                                                                                                                                                 |
| **Evidencia de pruebas**        | Specs de lectura de folios (`readProductVersion.spec.ts`) y de exhibición por régimen (`useEditionLabel.spec.ts`, Sidebar/SimpleLayout). Specs AuditTrail: `audit.service.persist.spec.ts`, `audit.controller.spec.ts`, `expedientes.audit-doc.spec.ts`. Specs ILA: `informeLongitudinalAudiometrico.spec.ts`. UAT: exhibición `Ramazzini v2.0.0` en tenant `SIN_REGIMEN`, consulta de auditoría como Principal, crear→finalizar informe longitudinal audiométrico, modal bloqueante de acuerdo de confidencialidad en tenant `SIN_REGIMEN`. Specs: `acuerdo-confidencialidad.service.spec.ts`. |
| **Resultado de aceptación**     | Pendiente                                                                                                                                                                                                                                                                                                                             |
| **Responsable de autorización** | —                                                                                                                                                                                                                                                                                                                                     |


---

*Plantilla para nuevas entradas:*

```markdown
### vX.Y.Z — YYYY-MM-DD

| Campo | Valor |
|-------|-------|
| **Descripción** | [Descripción del cambio] |
| **Tipo de cambio** | Parche / Menor / Mayor |
| **Evidencia de pruebas** | [Referencia a pruebas] |
| **Resultado de aceptación** | [Aprobado/Rechazado] |
| **Responsable de autorización** | [Nombre] |
```
