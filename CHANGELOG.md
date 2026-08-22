# CHANGELOG — Índice de folios de Ramazzini

Ramazzini es **un producto** SaaS (un frontend, un backend, un deploy). El aislamiento es por tenant (`ProveedorSalud`). No hay dos productos ni dos binarios.

Hay **dos líneas de folio** (edition tracks). El trámite y la certificación aplican **solo** a la línea 1.0 SIRES. El folio que se exhibe y documenta se resuelve en **runtime** según `regimenRegulatorio` del tenant (`SIRES_NOM024` o `SIN_REGIMEN`).

| Línea | Régimen | Folio vigente | Registro |
| ----- | ------- | ------------- | -------- |
| SIRES / certificación | `SIRES_NOM024` | ver registro | [CHANGELOG-SIRES.md](CHANGELOG-SIRES.md) |
| Comercial / sin régimen SIRES | `SIN_REGIMEN` | ver registro | [CHANGELOG-RAMAZZINI.md](CHANGELOG-RAMAZZINI.md) |

Este índice **no** es fuente de la versión exhibida. `frontend/package.json` y `backend/package.json` `"version"` son la versión npm del paquete, no el folio de edición.

**Incremento:** cambio solo SIRES → solo `CHANGELOG-SIRES.md`. Cambio solo `SIN_REGIMEN` → solo `CHANGELOG-RAMAZZINI.md`. Cambio de núcleo compartido → ambos parches, misma fecha, referencia cruzada («mismo cambio de código, dos folios de edición»).
