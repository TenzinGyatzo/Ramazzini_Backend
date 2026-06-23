# CHANGELOG - Ramazzini

Registro de cambios del proyecto. Este documento cumple con la política de control de versiones y trazabilidad.

**Contexto histórico:** El desarrollo de Ramazzini inició en enero 2024. Las versiones previas a v1.0.0 fueron liberadas sin changelog formal ni esquema de trazabilidad regulatoria. A partir de v1.0.0 (marzo 2026) se aplica versionamiento semántico oficial (MAYOR.MENOR.PARCHE) y trazabilidad conforme a los requisitos del SIRES.

---

## 1. Resumen de Versiones

**Versión vigente del software:** `v1.0.0`

> Fuente de verdad para la interfaz y despliegues. Actualizar al liberar una versión nueva, según la política de la **sección 3** (formato `vX.Y.Z`).

| VERSIÓN | FECHA | DESCRIPCIÓN GENERAL | TIPO |
|---------|-------|---------------------|------|
| v1.0.0 | 2026-03 *(previsto)* | Versión candidata a certificación NOM-024-SSA3-2012. Primera versión oficial. | Mayor |
| v0.2.0 | 2025-04 | Versión comercial. Nuevo repositorio. Mejoras, correcciones y nuevas funcionalidades. | Desarrollo previo |
| v0.1.0 | 2024-09 | Primera versión. Aplicación no comercial para uso privado en AMES. | Desarrollo previo |

---

## 2. Clasificación del Cambio

Previo a pruebas formales, el cambio se clasifica según la siguiente tabla:

| Tipo de Cambio | Impacto | Incremento de Versión |
|----------------|---------|------------------------|
| Corrección de errores, mejoras de rendimiento, seguridad, UX o ampliaciones compatibles con el alcance vigente | Bajo/Medio | Parche (`vX.Y.Z+1`) |
| Ampliación relevante del alcance funcional, normativo o de interoperabilidad | Alto | Menor (`vX.Y+1.0`) |
| Modificación significativa de arquitectura, alcance general o naturaleza del sistema | Muy alto | Mayor (`vX+1.0.0`) |
| Cambio normativo o de interoperabilidad certificada | Alto | Menor o Mayor (según §3.2 y §3.3) |

---

## 3. Reglas de Versionamiento

El SIRES RAMAZZINI utiliza un esquema de versionamiento compuesto por tres elementos numéricos en el formato **MAYOR.MENOR.PARCHE**.

**Ejemplo:** `v1.0.0`

Donde:

- **MAYOR** identifica cambios de gran alcance que modifican significativamente la naturaleza o arquitectura general del sistema.
- **MENOR** identifica ampliaciones relevantes del alcance funcional, normativo o de interoperabilidad previamente liberado.
- **PARCHE** identifica correcciones, mejoras o ampliaciones compatibles con el alcance de la versión vigente.

### 3.1 Versiones de Parche (`vX.Y.x`)

Las versiones de parche corresponden a modificaciones que mantienen el alcance general de la versión certificada y no representan una ampliación relevante de los mecanismos regulatorios, de interoperabilidad o de intercambio de información implementados por el sistema.

Entre otros, podrán liberarse bajo una versión de parche:

- Correcciones de errores.
- Mejoras de rendimiento.
- Mejoras de seguridad.
- Mejoras visuales.
- Refactorización interna de código.
- Optimización de procesos existentes.
- Incorporación de nuevos documentos clínicos.
- Incorporación de nuevos cuestionarios.
- Incorporación de nuevos formularios.
- Incorporación de nuevos reportes.
- Incorporación de nuevas estadísticas.
- Incorporación de nuevos dashboards.
- Incorporación de nuevos catálogos internos.
- Incorporación de nuevos campos dentro de documentos existentes.
- Nuevas validaciones de captura.
- Mejoras de experiencia de usuario.
- Ajustes a procesos ya existentes.

**Ejemplos:** `v1.0.1`, `v1.0.2`, `v1.0.3`

### 3.2 Versiones Menores (`vX.Y.0`, con `Y ≥ 1`)

Las versiones menores corresponden a cambios que amplían de manera relevante el alcance originalmente definido para la versión liberada.

Entre otros, podrán requerir una nueva versión menor:

- Incorporación de nuevas guías de intercambio de información en salud.
- Incorporación de nuevos mecanismos de interoperabilidad.
- Incorporación de nuevos estándares de intercambio de información.
- Incorporación de nuevos procesos regulatorios que amplíen el alcance original del sistema.
- Incorporación de nuevas capacidades que modifiquen sustancialmente el propósito o alcance funcional previamente liberado.
- Modificaciones significativas a los mecanismos certificados de intercambio de información.
- Cambios que requieran una revisión integral de la documentación técnica o normativa asociada al sistema.

**Ejemplos:** `v1.1.0`, `v1.2.0`

### 3.3 Versiones Mayores (`vX.0.0`, con `X ≥ 2`)

Las versiones mayores corresponden a cambios que modifican de forma significativa la arquitectura, alcance general o naturaleza del sistema.

Entre otros, podrán requerir una nueva versión mayor:

- Rediseño sustancial de la arquitectura del sistema.
- Sustitución de componentes fundamentales.
- Cambios que alteren significativamente la forma en que opera el sistema.
- Reestructuración integral de módulos principales.
- Evolución del sistema hacia una nueva generación tecnológica.

**Ejemplos:** `v2.0.0`, `v3.0.0`

### 3.4 Versión vigente y despliegue

El valor **Versión vigente del software** (sección 1) debe mantenerse alineado con lo desplegado. Al incrementar la versión mayor (§3.3), menor (§3.2) o de parche (§3.1), actualice ese campo, el resumen de versiones y el historial detallado.

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

### v1.0.1 — 2026-06-22 *(en desarrollo)*

| Campo | Valor |
|-------|-------|
| **Descripción** | Persistencia opt-in del trail de auditoría NOM-024 mediante `AUDIT_TRAIL_PERSIST`. En desarrollo (valor ausente o `false`) no se escriben eventos en `auditevents` ni `giisexportaudits`; en producción debe configurarse `AUDIT_TRAIL_PERSIST=true` en `.env.production`. Aviso de arranque si producción opera sin la variable activa. |
| **Tipo de cambio** | Parche |
| **Evidencia de pruebas** | `npm run test:nom024`; specs `audit-trail-persist.util.spec.ts`, `audit.service.persist.spec.ts`, `giis-export-audit.service.spec.ts` |
| **Resultado de aceptación** | Pendiente |
| **Responsable de autorización** | — |

---

### v1.0.0 — 2026-03 *(previsto)*

| Campo | Valor |
|-------|-------|
| **Descripción** | Versión candidata a certificación según NOM-024-SSA3-2012. Primera versión oficial de Ramazzini. Desarrollo iniciado en rama separada (noviembre 2025). |
| **Tipo de cambio** | Mayor |
| **Evidencia de pruebas** | Pendiente — proceso de certificación |
| **Resultado de aceptación** | Pendiente |
| **Responsable de autorización** | — |

---

### v0.2.0 — 2025-04

| Campo | Valor |
|-------|-------|
| **Descripción** | Versión comercial. Desarrollo en nuevo repositorio desde enero 2025. Incluye mejoras, correcciones y nuevas funcionalidades acumuladas durante el ciclo de desarrollo. |
| **Tipo de cambio** | Desarrollo previo (sin trazabilidad formal) |
| **Evidencia de pruebas** | No documentada en changelog formal |
| **Resultado de aceptación** | — |
| **Responsable de autorización** | — |

---

### v0.1.0 — 2024-09

| Campo | Valor |
|-------|-------|
| **Descripción** | Primera versión de Ramazzini. Aplicación no comercial para uso privado en la empresa AMES. Desarrollo iniciado en enero 2024. |
| **Tipo de cambio** | Desarrollo previo (sin trazabilidad formal) |
| **Evidencia de pruebas** | No documentada |
| **Resultado de aceptación** | — |
| **Responsable de autorización** | — |

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
