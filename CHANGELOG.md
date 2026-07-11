# CHANGELOG - Ramazzini

Registro de cambios del proyecto. Este documento cumple con la política de control de versiones y trazabilidad.

**Contexto histórico:** Ramazzini comenzó su desarrollo en enero 2024 (versiones v0.1.0 y v0.2.0), liberadas sin changelog formal ni esquema de trazabilidad regulatoria. Durante meses se desarrolló en la rama `nom024` el conjunto de funcionalidades necesarias para la línea de producto **v1.0**, candidata a certificación conforme a NOM-024-SSA3-2012. El despliegue de **v1.0.0** — primera versión oficial con trazabilidad regulatoria — se efectuó el **7 de junio de 2026**. A partir de esa versión se aplica versionamiento semántico oficial (MAYOR.MENOR.PARCHE) y trazabilidad conforme a los requisitos del SIRES.

**Línea de producto en certificación:** La versión que se someterá al proceso de certificación es **v1.0**, la cual comprende todas las revisiones de parche **v1.0.n** (`v1.0.0`, `v1.0.1`, …). Los parches no abren una nueva línea de producto; acumulan mejoras dentro del mismo alcance candidato. Ninguna entrada de este registro implica certificación obtenida hasta concluir el proceso formal.

---



## 1. Resumen de Versiones

**Versión vigente del software:** `v1.0.2`  
**Línea de producto (certificación):** `v1.0` — incluye `v1.0.0` … `v1.0.n`

> Fuente de verdad para la interfaz y despliegues. Actualizar al liberar una versión nueva, según la política de la **sección 3** (formato `vX.Y.Z`).


| VERSIÓN | FECHA      | DESCRIPCIÓN GENERAL                                                                                                                                                                                                                                     | TIPO              |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| v1.0.2  | 2026-07-10 | Parche de correcciones y mejoras de UX: tratamiento unificado de logotipos y firmas, vista previa de expediente al hover en tabla de trabajadores, perfil de proveedor, usuarios fuera de México, auditoría, soporte de modo oscuro en componentes, CLUES 9998, transferencia de trabajadores, importación de trabajadores, audiometría AMA y estabilidad de PDFs. | Parche            |
| v1.0.1  | 2026-06-25 | Parche de mejoras identificadas durante la elaboración de TEC-001, TEC-002 y TEC-003 (seguridad, confidencialidad, consentimiento, auditoría).                                                                                                          | Parche            |
| v1.0.0  | 2026-06-07 | Primera versión candidata a certificación NOM-024-SSA3-2012. Primera versión oficial con trazabilidad regulatoria. Desarrollo acumulado en rama `nom024`.                                                                                               | Mayor             |
| v0.2.0  | 2025-04    | Versión comercial. Nuevo repositorio. Mejoras, correcciones y nuevas funcionalidades.                                                                                                                                                                   | Desarrollo previo |
| v0.1.0  | 2024-09    | Primera versión. Aplicación no comercial para uso privado en AMES.                                                                                                                                                                                      | Desarrollo previo |


---



## 2. Clasificación del Cambio

Previo a pruebas formales, el cambio se clasifica según la siguiente tabla:


| Tipo de Cambio                                                                                                 | Impacto    | Incremento de Versión             |
| -------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------- |
| Corrección de errores, mejoras de rendimiento, seguridad, UX o ampliaciones compatibles con el alcance vigente | Bajo/Medio | Parche (`vX.Y.Z+1`)               |
| Ampliación relevante del alcance funcional, normativo o de interoperabilidad                                   | Alto       | Menor (`vX.Y+1.0`)                |
| Modificación significativa de arquitectura, alcance general o naturaleza del sistema                           | Muy alto   | Mayor (`vX+1.0.0`)                |
| Cambio normativo o de interoperabilidad certificada                                                            | Alto       | Menor o Mayor (según §3.2 y §3.3) |


---



## 3. Reglas de Versionamiento

El SIRES RAMAZZINI utiliza un esquema de versionamiento compuesto por tres elementos numéricos en el formato **MAYOR.MENOR.PARCHE**.

**Ejemplo:** `v1.0.0`

Donde:

- **MAYOR** identifica cambios de gran alcance que modifican significativamente la naturaleza o arquitectura general del sistema.
- **MENOR** identifica ampliaciones relevantes del alcance funcional, normativo o de interoperabilidad previamente liberado.
- **PARCHE** identifica correcciones, mejoras o ampliaciones compatibles con el alcance de la versión vigente.



### 3.1 Versiones de Parche (`vX.Y.x`)

Las versiones de parche corresponden a modificaciones que mantienen el alcance general de la línea de producto **v1.0** (candidata a certificación) y no representan una ampliación relevante de los mecanismos regulatorios, de interoperabilidad o de intercambio de información implementados por el sistema.

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



### v1.0.2 — 2026-07-10


| Campo                           | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**                 | Parche de la línea **v1.0** con correcciones y mejoras de UX identificadas tras el despliegue de v1.0.1. **(1) Logotipos y firmas (frontend/backend):** procesamiento automático al subir imagen en perfil de proveedor y perfiles de firmantes (`processBrandingImage`): elimina fondo claro, recorta márgenes, normaliza a PNG 500×500 px para informes PDF y muestra vista previa; omite reprocesamiento si la imagen ya está optimizada. Backend: normalización de rutas de almacenamiento en VPS (`branding-assets-dir.util`). **(2) Perfil de proveedor (frontend):** precarga del formulario al navegar sin recargar la página; corrección al guardar proveedores evitando revalidación regulatoria innecesaria cuando el país no cambia. **(3) Vista previa de expediente en tabla de trabajadores (frontend/backend):** al mantener el cursor sobre el botón «Expediente» en `DataTableDT` (solo escritorio ≥768 px, vía `useExpedienteTooltipEnabled`), tooltip flotante con resumen del expediente: conteo por tipo de documento clínico, resultados clínicos, otros registros vinculados y fecha de última actividad; badge dinámico con el total de documentos en el botón; prefetch diferido (100 ms) y caché en cliente de 3 min (`expedienteResumenTrabajador`) respaldado por `GET /api/expedientes/:trabajadorId/conteos`; deshabilitado en dispositivos móviles para no interferir con la interacción táctil. **(4) Auditoría (frontend):** mejora de responsividad en la vista de auditoría. **(5) Exportación GIIS (frontend):** generación de `CEX.txt` condicionada a variable de entorno. **(6) CLUES (backend):** excepción del código sentinela **9998** (servicios médicos privados). **(7) Transferencia de trabajadores (backend):** registro de evento de auditoría al transferir trabajadores entre empresas. **(8) Estabilidad (backend):** silenciador de errores por PDF no disponible; correcciones de herencia de `createdBy`; compatibilidad cross-tenant en expedientes clonados; prevención de operaciones cross-tenant; ajuste de márgenes en examen de vista para firma visible. **(9) Modo oscuro (frontend):** ampliación del soporte visual en modo oscuro en componentes y vistas que aún presentaban bajo contraste o fondos incompatibles; incluye ajustes en `dark-mode.css`, modales de trabajo, visualizadores de documentos clínicos, tablas de riesgos de trabajo, dashboard de RTs, formularios de captura (selectores de país/teléfono, cuestionarios, nota médica, audiometría) y pantallas de autenticación. **(10) Audiometría AMA (frontend/backend):** corrección de inconsistencia entre visualizador, PDF y badge PAB; el cálculo de pérdida auditiva bilateral AMA se alinea para recalcular desde frecuencias (500, 1000, 2000 y 3000 Hz), evitando mostrar valores legacy guardados con fórmula anterior. **(11) Importación de trabajadores (frontend/backend):** actualización y generación de plantillas de importación; incorporación de referencia de catálogos para importación; mejoras en carga masiva, resumen de importación y validaciones asociadas. **(12) Administración y UX complementaria (frontend):** panel de carga masiva de códigos SIRES, ajustes en gestión de documentos/grupos, mejoras en vistas administrativas y ajuste visual en suscripción. |
| **Tipo de cambio**              | Parche                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Evidencia de pruebas**        | Pruebas manuales de carga de logotipo y firma; pruebas manuales de vista previa de expediente al hover en tabla de trabajadores (tooltip, badge, caché y comportamiento en móvil); specs `processProviderLogo.spec.ts`, `expedienteResumenTrabajador.spec.ts` y `expedientes-document-counts.spec.ts`; pruebas manuales de perfil de proveedor (navegación, guardado en SIN_REGIMEN y SIRES_NOM024); pruebas manuales de usuarios no mexicanos; specs existentes del backend según módulos modificados; verificación manual del modo oscuro en vistas y modales afectados (contraste, inputs, tablas y botones); verificación manual de audiometría AMA comparando visualizador, PDF y badge PAB; specs de importación de trabajadores, referencia de catálogos de importación, plantilla de importación y carga masiva de códigos SIRES.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Resultado de aceptación**     | Pendiente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Responsable de autorización** | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |




---



### v1.0.1 — 2026-06-26


| Campo                           | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**                 | Parche de la línea **v1.0** que consolida mejoras aplicadas tras el despliegue de v1.0.0 (7-jun-2026), identificadas al elaborar y revisar los documentos técnicos TEC-001, TEC-002 y TEC-003. **(1) Seguridad de salidas (TEC-001 §5.6, TEC-003 v2.0):** eliminación de exposición anónima de archivos clínicos; `ClinicalFilesController` con `assertUserCanAccessClinicalPath`; `InformeAccessInterceptor` y `assertUserCanAccessTrabajador` en `/informes/`*; `BrandingAssetsController` para firmas y logos con validación de tenant; alineación de Nginx en producción según `docs/NGINX_CAMBIOS_SEGURIDAD_SALIDAS.md`. **(2) Acuerdo de confidencialidad (PRO-006, TEC-002 v2.0):** módulo `acuerdo-confidencialidad`, `ConfidentialityAgreementGuard` global y flujo de aceptación en frontend. **(3) Consentimiento para tratamiento de información:** sustitución del modelo de consentimiento diario por consentimiento versionado por trabajador (`ConsentimientosModule`, `TreatmentConsentGuard`, API `/api/consentimientos`). **(4) Auditoría NOM-024:** persistencia opt-in del trail mediante `AUDIT_TRAIL_PERSIST=true` en producción SIRES; aviso de arranque si el entorno opera sin la variable activa. Documentación técnica actualizada en paralelo: TEC-001, TEC-002 v2.0 (24-jun-2026) y TEC-003 v2.0 (25-jun-2026); versiones anteriores resguardadas en `SGSI/8. Histórico/`. |
| **Tipo de cambio**              | Parche                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Evidencia de pruebas**        | `npm run test:nom024`; specs `clinical-files.service.spec.ts`, `branding-assets.service.spec.ts`, `informe-access.interceptor.spec.ts`, `jwt-auth.guard.spec.ts`, `audit-trail-persist.util.spec.ts`, `audit.service.persist.spec.ts`, `giis-export-audit.service.spec.ts`; pruebas manuales §8 de `docs/NGINX_CAMBIOS_SEGURIDAD_SALIDAS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Resultado de aceptación**     | Aprobado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Responsable de autorización** | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |




---



### v1.0.0 — 2026-06-07


| Campo                           | Valor                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**                 | Primera versión **candidata** a certificación NOM-024-SSA3-2012 y primera versión oficial de Ramazzini con trazabilidad regulatoria. Inicia la línea de producto **v1.0**. Consolida meses de desarrollo en la rama `nom024` sobre la base del sistema existente (v0.x). Despliegue registrado el 7 de junio de 2026. El proceso de certificación formal permanece en curso. |
| **Tipo de cambio**              | Mayor                                                                                                                                                                                                                                                                                                                                                                        |
| **Evidencia de pruebas**        | Pendiente — proceso de certificación                                                                                                                                                                                                                                                                                                                                         |
| **Resultado de aceptación**     | Pendiente                                                                                                                                                                                                                                                                                                                                                                    |
| **Responsable de autorización** | —                                                                                                                                                                                                                                                                                                                                                                            |


---



### v0.2.0 — 2025-04


| Campo                           | Valor                                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**                 | Versión comercial. Desarrollo en nuevo repositorio desde enero 2025. Incluye mejoras, correcciones y nuevas funcionalidades acumuladas durante el ciclo de desarrollo. |
| **Tipo de cambio**              | Desarrollo previo (sin trazabilidad formal)                                                                                                                            |
| **Evidencia de pruebas**        | No documentada en changelog formal                                                                                                                                     |
| **Resultado de aceptación**     | —                                                                                                                                                                      |
| **Responsable de autorización** | —                                                                                                                                                                      |


---



### v0.1.0 — 2024-09


| Campo                           | Valor                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**                 | Primera versión de Ramazzini. Aplicación no comercial para uso privado en la empresa AMES. Desarrollo iniciado en enero 2024. |
| **Tipo de cambio**              | Desarrollo previo (sin trazabilidad formal)                                                                                   |
| **Evidencia de pruebas**        | No documentada                                                                                                                |
| **Resultado de aceptación**     | —                                                                                                                             |
| **Responsable de autorización** | —                                                                                                                             |


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

