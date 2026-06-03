# Repositorio Backend - Visión General

## Arquitectura de Alto Nivel

El backend está construido con **NestJS** (Node.js framework), utiliza **MongoDB** como base de datos (con Mongoose ODM), y sigue una arquitectura modular basada en dominios.

### Estructura de Módulos Principales

Los módulos principales del sistema se organizan en `src/modules/`:

#### Módulos de Dominio Core
- **`trabajadores/`** - Gestión de trabajadores (personas que reciben atención médica)
- **`expedientes/`** - Gestión de documentos médicos (notas médicas, historias clínicas, certificados, etc.)
- **`empresas/`** - Gestión de empresas clientes
- **`centros-trabajo/`** - Gestión de centros de trabajo (ubicaciones físicas de las empresas)
- **`proveedores-salud/`** - Gestión de proveedores de servicios de salud (quienes usan el sistema)

#### Módulos de Soporte
- **`auth/`** - Autenticación y autorización (JWT)
- **`users/`** - Gestión de usuarios del sistema
- **`informes/`** - Generación de documentos PDF (informes médicos)
- **`printer/`** - Servicio de generación de PDFs (pdfmake)
- **`document-merger/`** - Fusión de documentos PDF
- **`emails/`** - Envío de correos electrónicos
- **`pagos/`** - Gestión de pagos y suscripciones

#### Módulos de Firmantes
- **`medicos-firmantes/`** - Médicos que pueden firmar documentos
- **`enfermeras-firmantes/`** - Enfermeras que pueden firmar documentos
- **`tecnicos-firmantes/`** - Técnicos que pueden firmar documentos

#### Otros Módulos
- **`riesgos-trabajo/`** - Gestión de riesgos laborales
- **`informe-personalizacion/`** - Personalización de informes

---

## Entidades Principales y Relaciones

### Modelo de Datos Core

#### **Trabajador** (Worker/Person)
**Ubicación:** `src/modules/trabajadores/schemas/trabajador.schema.ts`

Representa a una persona que recibe atención médica ocupacional. Es la entidad central del sistema.

**Campos principales:**
- `primerApellido`, `segundoApellido`, `nombre` - Nombre completo
- `fechaNacimiento` - Fecha de nacimiento
- `sexo` - Enum: "Masculino", "Femenino"
- `curp` - CURP (opcional actualmente, debería ser obligatorio según NOM-024)
- `numeroEmpleado` - Número de empleado interno
- `nss` - Número de Seguridad Social
- `idCentroTrabajo` - Referencia a CentroTrabajo (relación)
- `createdBy`, `updatedBy` - Referencias a User (trazabilidad)

**Relaciones:**
- Pertenece a un `CentroTrabajo`
- Tiene múltiples documentos médicos (`Expediente` documents)
- Tiene `RiesgoTrabajo` asociados

#### **Expediente** (Medical Record Documents)
**Ubicación:** `src/modules/expedientes/schemas/`

No existe una colección única "Expediente". En su lugar, hay múltiples tipos de documentos médicos, cada uno con su propia colección:

1. **HistoriaClinica** - Historia clínica ocupacional
2. **NotaMedica** - Notas médicas (consultas)
3. **ExploracionFisica** - Exploración física
4. **Audiometria** - Resultados de audiometría
5. **ExamenVista** - Examen de vista
6. **AptitudPuesto** - Certificado de aptitud para el puesto
7. **CertificadoExpedito** - Certificado de salud expedito
8. **Certificado** - Otros certificados
9. **ConstanciaAptitud** - Constancia de aptitud
10. **ControlPrenatal** - Control prenatal
11. **Antidoping** - Pruebas de antidoping
12. **PrevioEspirometria** - Cuestionario previo a espirometría
13. **HistoriaOtologica** - Historia otológica
14. **Receta** - Recetas médicas
15. **DocumentoExterno** - Documentos médicos externos (escaneados/PDFs)

**Campos comunes en todos los documentos:**
- `idTrabajador` - Referencia a Trabajador (obligatorio)
- `rutaPDF` - Ruta del PDF generado (obligatorio)
- `createdBy`, `updatedBy` - Referencias a User (trazabilidad)
- `fecha*` - Campo de fecha específico según tipo de documento (ej: `fechaNotaMedica`, `fechaHistoriaClinica`)

**Relaciones:**
- Cada documento pertenece a un `Trabajador`
- Los PDFs se generan mediante el módulo `informes/`

#### **Empresa**
**Ubicación:** `src/modules/empresas/schemas/empresa.schema.ts`

Representa una empresa cliente que recibe servicios de salud ocupacional.

**Campos principales:**
- `nombreComercial`, `razonSocial`
- `RFC` - RFC único
- `idProveedorSalud` - Referencia a ProveedorSalud (quien atiende a la empresa)

#### **CentroTrabajo** (Work Center)
**Ubicación:** `src/modules/centros-trabajo/schemas/centro-trabajo.schema.ts`

Representa una ubicación física de trabajo dentro de una empresa.

**Campos principales:**
- `nombreCentro`
- `direccionCentro`, `codigoPostal`, `estado`, `municipio`
- `idEmpresa` - Referencia a Empresa

#### **ProveedorSalud** (Healthcare Provider)
**Ubicación:** `src/modules/proveedores-salud/schemas/proveedor-salud.schema.ts`

Representa la organización que presta servicios de salud (quien usa el sistema).

**Campos principales:**
- `nombre`, `perfilProveedorSalud`
- `estado`, `municipio`, `codigoPostal`, `direccion`
- `estadoSuscripcion`, `suscripcionActiva`
- Configuración de límites y reglas de puntaje

---

## Flujos de Solicitud Principales

### 1. Crear Trabajador

**Endpoint:** `POST /api/:empresaId/:centroId/registrar-trabajador`

**Controlador:** `src/modules/trabajadores/trabajadores.controller.ts`
**Servicio:** `src/modules/trabajadores/trabajadores.service.ts`

**Flujo:**
1. Validación del DTO (`CreateTrabajadorDto`)
2. Normalización de datos (mayúsculas en nombres, etc.)
3. Validación de unicidad de `numeroEmpleado` a nivel centro de trabajo
4. Creación del documento en MongoDB
5. Retorno del trabajador creado

**DTO:** `src/modules/trabajadores/dto/create-trabajador.dto.ts`

### 2. Crear/Actualizar Documento Médico

**Endpoint:** `POST /api/expedientes/:trabajadorId/documentos/:documentType/crear`
**Endpoint:** `PATCH /api/expedientes/:trabajadorId/documentos/:documentType/:id/actualizar`

**Controlador:** `src/modules/expedientes/expedientes.controller.ts`
**Servicio:** `src/modules/expedientes/expedientes.service.ts`

**Flujo para crear:**
1. Validación del DTO según tipo de documento
2. Creación del documento en la colección correspondiente
3. Actualización del `updatedAt` del trabajador asociado
4. Retorno del documento creado

**Tipos de documentos soportados:** `antidoping`, `aptitud`, `audiometria`, `certificado`, `certificadoExpedito`, `documentoExterno`, `examenVista`, `exploracionFisica`, `historiaClinica`, `notaMedica`, `controlPrenatal`, `historiaOtologica`, `previoEspirometria`, `receta`, `constanciaAptitud`

**DTOs:** `src/modules/expedientes/dto/create-*.dto.ts` y `update-*.dto.ts`

### 3. Generación de PDF

**Módulo:** `src/modules/informes/informes.service.ts`

Los PDFs se generan mediante el servicio `PrinterService` que usa `pdfmake`. Cada tipo de documento tiene una función de generación de informe en `src/modules/informes/documents/`.

**Flujo:**
1. Se obtienen los datos del documento, trabajador, empresa, proveedor de salud
2. Se obtiene el firmante correspondiente (médico, enfermera, técnico)
3. Se genera el PDF usando la función de informe específica
4. Se guarda el PDF en disco y se almacena la ruta en `rutaPDF`

---

## Convenciones y Restricciones Importantes

### Timestamps y Trazabilidad

**Todos los esquemas principales incluyen:**
- `createdAt`, `updatedAt` - Generados automáticamente por Mongoose (`timestamps: true`)
- `createdBy`, `updatedBy` - Referencias a `User` (ObjectId) que indican quién creó/modificó el registro

**Ubicación de timestamps:**
- Configurado en cada schema: `.set('timestamps', true)`

### Convenciones de Nombres

- **Schemas:** `*.schema.ts` (ej: `trabajador.schema.ts`)
- **Entities:** `*.entity.ts` (interfaces TypeScript, ej: `trabajador.entity.ts`)
- **DTOs:** `create-*.dto.ts`, `update-*.dto.ts`
- **Controllers:** `*.controller.ts`
- **Services:** `*.service.ts`

### Validaciones

- Los DTOs usan decoradores de `class-validator` para validación
- Validaciones comunes: `@IsNotEmpty()`, `@IsString()`, `@IsMongoId()`, `@IsEnum()`, `@IsDate()`, etc.
- Validaciones de negocio se realizan en los servicios

### Índices de Base de Datos

Los schemas incluyen índices para optimizar consultas frecuentes:
- `Trabajador`: índices en `idCentroTrabajo`, `numeroEmpleado`, `estadoLaboral`
- `Empresa`: índices en `nombreComercial`, `razonSocial`, `RFC`, `idProveedorSalud`
- `CentroTrabajo`: índices en `idEmpresa`, `nombreCentro`

### Estructura de Rutas API

- Trabajadores: `/api/:empresaId/:centroId/...`
- Expedientes: `/api/expedientes/:trabajadorId/documentos/...`
- Otros módulos: `/api/{module-name}/...`

---

## Catálogos y Datos Maestros

**Ubicación:** `backend/catalogs/`

El sistema incluye catálogos normalizados en formato CSV en `catalogs/normalized/`:
- `diagnosticos_sis.csv` - CIE-10
- `codigos_postales.csv` - Códigos postales
- `enitades_federativas.csv` - Entidades federativas (INEGI)
- `municipios.csv` - Municipios (INEGI)
- `localidades.csv` - Localidades (INEGI)
- `establecimiento_de_salud_sis.csv` - CLUES
- `cat_nacionalidades.csv` - Nacionalidades (RENAPO)
- `cat_religiones.csv` - Religiones
- `lenguas_indigenas.csv` - Lenguas indígenas

**Nota:** Actualmente estos catálogos existen como archivos CSV pero no están integrados en el backend como servicios/validaciones activas.

---

## ¿Dónde Buscar Primero?

### Para entender la estructura de trabajadores:
- `src/modules/trabajadores/schemas/trabajador.schema.ts` - Schema de MongoDB
- `src/modules/trabajadores/entities/trabajador.entity.ts` - Interface TypeScript
- `src/modules/trabajadores/dto/create-trabajador.dto.ts` - Validaciones de entrada

### Para entender documentos médicos:
- `src/modules/expedientes/schemas/` - Todos los schemas de documentos
- `src/modules/expedientes/dto/` - DTOs de creación/actualización
- `src/modules/expedientes/expedientes.service.ts` - Lógica de negocio

### Para entender la generación de PDFs:
- `src/modules/informes/informes.service.ts` - Servicio principal
- `src/modules/informes/documents/*.informe.ts` - Funciones de generación por tipo
- `src/modules/printer/printer.service.ts` - Servicio de PDF (pdfmake)

### Para entender autenticación/autorización:
- `src/modules/auth/` - Módulo de autenticación
- `src/modules/users/` - Gestión de usuarios

### Para entender NOM-024 y requerimientos normativos:
- `docs/nom-024/README.md` - Visión general
- `docs/nom-024/nom024_core_requirements.md` - Requerimientos core
- `docs/nom-024/giis_*.md` - Guías de intercambio específicas

---

## Notas de Implementación NOM-024

**Estado actual:** El sistema NO cumple completamente con NOM-024-SSA3-2012 en su estado actual. Ver documentos en `docs/nom-024/` y `PLAN_NOM024_FASE1_*.md` para detalles de brechas y planes de implementación.

**Brechas principales identificadas:**
1. CURP no es obligatorio (debería serlo)
2. Datos geográficos no usan catálogos INEGI estructurados
3. Diagnósticos son texto libre (deberían usar CIE-10)
4. CLUES no está presente en documentos médicos
5. No hay diferenciación entre documentos en borrador vs finalizados
6. No hay mecanismo de inalterabilidad una vez finalizados

