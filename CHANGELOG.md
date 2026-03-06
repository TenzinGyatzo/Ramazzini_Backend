# CHANGELOG - Ramazzini

Registro de cambios del proyecto. Este documento cumple con la política de control de versiones y trazabilidad.

**Contexto histórico:** El desarrollo de Ramazzini inició en enero 2024. Las versiones previas a v1.0 fueron liberadas sin changelog formal. A partir de v1.0 (marzo 2026) se aplica versionamiento y trazabilidad oficial.

---

## 1. Resumen de Versiones

| VERSIÓN | FECHA | DESCRIPCIÓN GENERAL | TIPO |
|---------|-------|---------------------|------|
| v1.0 | 2026-03 *(previsto)* | Versión candidata a certificación NOM-024-SSA3-2012. Primera versión oficial. | Mayor |
| v0.2 | 2025-04 | Versión comercial. Nuevo repositorio. Mejoras, correcciones y nuevas funcionalidades. | Mayor |
| v0.1 | 2024-09 | Primera versión. App no comercial para uso privado en AMES. | Mayor |

---

## 2. Clasificación del Cambio

Previo a pruebas formales, el cambio se clasifica según la siguiente tabla:

| Tipo de Cambio | Impacto | Requiere Cambio de Versión |
|----------------|---------|---------------------------|
| Corrección menor | Bajo | Versión menor |
| Mejora funcional | Medio | Versión menor |
| Cambio estructural BD | Alto | Versión mayor |
| Cambio normativo | Alto | Versión mayor |
| Cambio de seguridad | Medio/Alto | Según impacto |

---

## 3. Política de Versionamiento

**Formato:** `vX.Y`

### 3.1 Versión Mayor (X.0)

Se incrementa cuando:

- Se modifican estructuras de datos.
- Cambian flujos clínicos obligatorios.
- Se introducen nuevas obligaciones regulatorias.
- Se alteran mecanismos de interoperabilidad.

### 3.2 Versión Menor (X.Y)

Se incrementa cuando:

- Se corrigen errores.
- Se realizan mejoras no disruptivas.
- Se optimiza rendimiento.
- Se agregan funciones opcionales.

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

### v1.0 — 2026-03 *(previsto)*

| Campo | Valor |
|-------|-------|
| **Descripción** | Versión candidata a certificación según NOM-024-SSA3-2012. Primera versión oficial de Ramazzini. Desarrollo iniciado en rama separada (noviembre 2025). |
| **Tipo de cambio** | Mayor |
| **Evidencia de pruebas** | Pendiente — proceso de certificación |
| **Resultado de aceptación** | Pendiente |
| **Responsable de autorización** | — |

---

### v0.2 — 2025-04

| Campo | Valor |
|-------|-------|
| **Descripción** | Versión comercial. Desarrollo en nuevo repositorio desde enero 2025. Incluye mejoras, correcciones y nuevas funcionalidades acumuladas durante el ciclo de desarrollo. |
| **Tipo de cambio** | Mayor |
| **Evidencia de pruebas** | No documentada (sin changelog formal en ese período) |
| **Resultado de aceptación** | — |
| **Responsable de autorización** | — |

---

### v0.1 — 2024-09

| Campo | Valor |
|-------|-------|
| **Descripción** | Primera versión de Ramazzini. Aplicación no comercial para uso privado en la empresa AMES. Desarrollo iniciado en enero 2024. |
| **Tipo de cambio** | Mayor |
| **Evidencia de pruebas** | No documentada |
| **Resultado de aceptación** | — |
| **Responsable de autorización** | — |

---

*Plantilla para nuevas entradas:*

```markdown
### vX.Y — YYYY-MM-DD

| Campo | Valor |
|-------|-------|
| **Descripción** | [Descripción del cambio] |
| **Tipo de cambio** | Mayor / Menor |
| **Evidencia de pruebas** | [Referencia a pruebas] |
| **Resultado de aceptación** | [Aprobado/Rechazado] |
| **Responsable de autorización** | [Nombre] |
```
