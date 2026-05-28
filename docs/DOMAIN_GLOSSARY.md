# Glosario de Términos del Dominio

Este documento define los términos del dominio utilizados en el repositorio y sus equivalencias con conceptos de NOM-024-SSA3-2012 y GIIS.

---

## Términos de Personas

### **Trabajador** (Worker)
**Definición:** Persona que recibe atención médica ocupacional a través del sistema. Es el sujeto de atención médica.

**Ubicación en código:**
- Schema: `src/modules/trabajadores/schemas/trabajador.schema.ts`
- Entity: `src/modules/trabajadores/entities/trabajador.entity.ts`
- DTO: `src/modules/trabajadores/dto/create-trabajador.dto.ts`
- Service: `src/modules/trabajadores/trabajadores.service.ts`

**Equivalencias:**
- **NOM-024/GIIS:** "Paciente"
- **Nota:** El término "Trabajador" es específico del dominio de salud ocupacional, pero conceptualmente se refiere a lo que la NOM-024 llama "Paciente"

**Mapeo a NOM-024:**
- Corresponde a la entidad "Paciente" definida en la NOM-024
- Requiere identificación mínima (CURP obligatoria según NOM-024)
- Datos demográficos deben cumplir con Tabla 1 de NOM-024

---

### **Persona** (Person)
**Definición:** No existe como entidad separada. Se usa "Trabajador" para referirse a personas.

**Nota:** En el código, cuando se habla de "persona" generalmente se refiere a "Trabajador".

---

### **Paciente** (Patient)
**Definición:** No se usa este término en el código. El sistema usa "Trabajador" para referirse a la persona que recibe atención.

**Equivalencia NOM-024:** Es el término normativo correcto según NOM-024, pero el sistema usa "Trabajador" por dominio de salud ocupacional.

---

## Términos de Eventos Médicos

### **Expediente** (Medical Record)
**Definición:** Concepto genérico que se refiere a la totalidad de documentos médicos de un trabajador. No existe una colección "Expediente" única, sino múltiples tipos de documentos médicos.

**Ubicación en código:**
- Módulo: `src/modules/expedientes/`
- Múltiples schemas en: `src/modules/expedientes/schemas/`

**Estructura:** El expediente es la agregación lógica de todos los documentos médicos asociados a un `idTrabajador`.

**Equivalencia NOM-024:** Corresponde a "Expediente Clínico Electrónico (ECE)" - agrupador lógico de información del paciente.

---

### **Documento Médico** (Medical Document)
**Definición:** Cada tipo de documento médico es una entidad separada con su propia colección en MongoDB.

**Tipos de documentos:**
1. `HistoriaClinica` - Historia clínica ocupacional
2. `NotaMedica` - Nota médica (consulta)
3. `ExploracionFisica` - Exploración física
4. `Audiometria` - Audiometría
5. `ExamenVista` - Examen de vista
6. `AptitudPuesto` - Certificado de aptitud
7. `CertificadoExpedito` - Certificado expedito
8. `Certificado` - Otros certificados
9. `ConstanciaAptitud` - Constancia de aptitud
10. `ControlPrenatal` - Control prenatal
11. `Antidoping` - Prueba de antidoping
12. `PrevioEspirometria` - Cuestionario previo a espirometría
13. `HistoriaOtologica` - Historia otológica
14. `Receta` - Receta médica
15. `DocumentoExterno` - Documentos externos (escaneados)

**Ubicación:** `src/modules/expedientes/schemas/*.schema.ts`

**Equivalencia NOM-024:** Corresponde a "Documento Estructurado" - unidad atómica de intercambio. Debe ser estructurado, inalterable una vez finalizado, y contener metadatos de autoría.

---

### **Consulta** (Consultation)
**Definición:** No existe como entidad explícita. Se representa mediante:
- `NotaMedica` - Para consultas médicas generales
- Otros tipos de documentos según el tipo de atención

**Equivalencia NOM-024/GIIS:**
- **GIIS-B015 (Consulta Externa):** Una `NotaMedica` puede representar una consulta externa, pero falta estructura específica de GIIS-B015
- Requiere: fecha, servicio de atención, diagnósticos CIE-10, signos vitales, etc.

**Nota:** El sistema actualmente no diferencia explícitamente entre tipos de consultas según GIIS.

---

### **Screening / Detección** (Screening/Detection)
**Definición:** No existe como entidad explícita. Algunos documentos pueden representar detecciones:
- `HistoriaClinica` - Puede incluir detecciones preventivas
- `ExploracionFisica` - Incluye signos vitales y detecciones básicas

**Equivalencia NOM-024/GIIS:**
- **GIIS-B019 (Detecciones):** El sistema no tiene estructura específica para reportar detecciones según GIIS-B019
- Requiere: tipo de detección, resultados, fecha, profesional responsable, etc.

**Nota:** No está implementado actualmente como entidad específica.

---

### **Lesión** (Injury)
**Definición:** No existe como entidad explícita. Una lesión podría representarse mediante:
- `NotaMedica` con diagnóstico relacionado
- `DocumentoExterno` si viene de otra institución

**Equivalencia NOM-024/GIIS:**
- **GIIS-B013 (Lesiones):** El sistema no tiene estructura específica para reportar lesiones según GIIS-B013
- Requiere: fecha del evento, sitio de ocurrencia, intencionalidad, agente de lesión, códigos CIE-10 específicos, etc.

**Nota:** No está implementado actualmente.

---

### **Encuentro** (Encounter)
**Definición:** No existe como término explícito en el código. Se usa implícitamente cuando se crea cualquier documento médico (representa una interacción médico-paciente).

**Equivalencia NOM-024:** Corresponde a "Evento/Atención" - la interacción puntual (consulta, urgencia, etc.).

---

## Términos de Organizaciones

### **ProveedorSalud** (Healthcare Provider)
**Definición:** Organización o persona que presta servicios de salud ocupacional usando el sistema. Puede ser médico independiente, empresa de salud ocupacional, etc.

**Ubicación:**
- Schema: `src/modules/proveedores-salud/schemas/proveedor-salud.schema.ts`
- Entity: `src/modules/proveedores-salud/entities/proveedores-salud.entity.ts`

**Campos relevantes:**
- `perfilProveedorSalud` - Enum: "Médico único de empresa", "Médico independiente", "Empresa de salud ocupacional", etc.
- `nombre`, `estado`, `municipio`, `direccion`

**Equivalencia NOM-024:** Corresponde a "Prestador de Servicios de Salud" - la organización/institución que otorga atención.

**Nota:** Actualmente NO incluye campo CLUES (Clave Única de Establecimientos de Salud), que es obligatorio según NOM-024 para identificar establecimientos.

---

### **Establecimiento** (Establishment)
**Definición:** No existe como entidad explícita. El concepto está parcialmente representado por:
- `ProveedorSalud` - Pero no incluye CLUES
- Los documentos médicos no tienen referencia a establecimiento/CLUES

**Equivalencia NOM-024:** Debe existir como "Establecimiento" identificado por CLUES (Clave Única de Establecimientos de Salud) de 11 dígitos.

**Brecha:** El sistema NO tiene implementada la entidad Establecimiento ni CLUES, requeridos por NOM-024.

---

### **Empresa** (Company)
**Definición:** Cliente del proveedor de salud. Representa la empresa cuyos trabajadores reciben atención médica ocupacional.

**Ubicación:**
- Schema: `src/modules/empresas/schemas/empresa.schema.ts`
- Entity: `src/modules/empresas/entities/empresa.entity.ts`

**Equivalencia NOM-024:** No tiene equivalente directo en NOM-024. Es concepto específico del dominio de salud ocupacional (el "empleador" del trabajador).

---

### **CentroTrabajo** (Work Center)
**Definición:** Ubicación física de trabajo dentro de una empresa. Un trabajador pertenece a un centro de trabajo específico.

**Ubicación:**
- Schema: `src/modules/centros-trabajo/schemas/centro-trabajo.schema.ts`
- Entity: `src/modules/centros-trabajo/entities/centros-trabajo.entity.ts`

**Campos:**
- `nombreCentro`, `direccionCentro`, `codigoPostal`, `estado`, `municipio`

**Equivalencia NOM-024:** No tiene equivalente directo. Es concepto específico del dominio. Los datos geográficos deberían usar catálogos INEGI según NOM-024.

**Nota:** Los campos geográficos (`estado`, `municipio`) son texto libre actualmente, no usan códigos INEGI.

---

## Términos de Profesionales

### **MedicoFirmante** (Signing Physician)
**Definición:** Médico registrado que puede firmar documentos médicos. Incluye información de cédula profesional y firma.

**Ubicación:**
- Schema: `src/modules/medicos-firmantes/schemas/medico-firmante.schema.ts`
- Entity: `src/modules/medicos-firmantes/entities/medicos-firmante.entity.ts`

**Campos relevantes:**
- `nombre`, `primerApellido`, `segundoApellido` - Identificación del profesional (registros legacy conservan el nombre completo en `nombre`)
- `numeroCedulaProfesional` - Cédula profesional
- `firma` - Imagen de firma
- `idUser` - Referencia a User

**Equivalencia NOM-024:** Corresponde a "Profesional de la Salud" - usuario que genera información y requiere cédula/firma según NOM-024.

**Nota:** Actualmente NO incluye CURP del profesional, que es requerido por algunos GIIS (ej: GIIS-B013 requiere `curpResponsable`).

---

### **EnfermeraFirmante** (Signing Nurse)
**Definición:** Similar a MedicoFirmante, para enfermeras. Usa `nombre`, `primerApellido` y `segundoApellido` opcional.

**Ubicación:** `src/modules/enfermeras-firmantes/`

---

### **TecnicoFirmante** (Signing Technician)
**Definición:** Técnico que puede firmar ciertos documentos (ej: audiometrías).

**Ubicación:** `src/modules/tecnicos-firmantes/`

---

### **User** (Usuario del Sistema)
**Definición:** Usuario del sistema (puede ser médico, enfermera, administrativo, etc.). Se usa para autenticación y trazabilidad.

**Ubicación:**
- Schema: `src/modules/users/schemas/user.schema.ts`
- Entity: `src/modules/users/entities/user.entity.ts`

**Campos relevantes:**
- `role` - Enum: "Principal", "Médico", "Enfermero/a", "Administrativo", "Técnico Evaluador"
- Permisos granulares para diferentes funcionalidades

**Equivalencia NOM-024:** Corresponde a "Usuario/Rol" para el sistema de gestión de seguridad (SGSI).

---

## Términos de Estados

### **Finalizado** (Finalized)
**Definición:** NO existe como campo explícito en los documentos médicos actualmente.

**Brecha:** Los documentos NO tienen campo `estado` para diferenciar entre "borrador" y "finalizado".

**Equivalencia NOM-024:** Los documentos deben ser "inalterables" una vez finalizados según NOM-024. Requiere mecanismo de estado y bloqueo de ediciones.

---

### **Borrador** (Draft)
**Definición:** NO existe como concepto explícito. Todos los documentos pueden editarse libremente.

**Brecha:** No hay diferenciación entre documentos en proceso y documentos finalizados.

---

## Términos de Identificadores

### **Folio Interno** (Institutional Folio)
**Definición:** NO existe como campo explícito en documentos médicos.

**Equivalencia NOM-024:** Requerido por GIIS. Debe ser identificador único de atención por establecimiento y fecha (ej: 8 caracteres numéricos únicos por CLUES/fecha).

**Brecha:** El sistema usa `_id` de MongoDB como identificador, pero no genera "folio interno" según formato GIIS.

---

### **CURP** (Clave Única de Registro de Población)
**Definición:** Identificador único de 18 caracteres para personas.

**Ubicación:**
- Campo en `Trabajador`: `curp` (actualmente opcional, con validación regex básica)

**Equivalencia NOM-024:** Es el identificador único OBLIGATORIO según NOM-024 Tabla 1. Debe validarse contra RENAPO.

**Brecha:**
- Campo existe pero es opcional (debería ser obligatorio)
- No hay validación contra RENAPO (solo regex básica)
- No existe en documentos médicos para identificar al profesional responsable

---

### **CLUES** (Clave Única de Establecimientos de Salud)
**Definición:** Identificador de 11 dígitos para establecimientos de salud. NO está implementado.

**Equivalencia NOM-024:** Obligatorio para identificar la unidad médica que otorga atención. Debe validarse contra catálogo CLUES oficial.

**Brecha:** El sistema NO tiene campo CLUES en ninguna entidad ni documento médico.

---

### **CIE-10** (Clasificación Internacional de Enfermedades, 10ª revisión)
**Definición:** Sistema de códigos para diagnósticos médicos.

**Ubicación:**
- Catálogo: `backend/catalogs/normalized/diagnosticos.csv`
- Uso actual: Los documentos médicos usan texto libre en campo `diagnostico` (ej: `NotaMedica.diagnostico`)

**Equivalencia NOM-024:** Obligatorio usar códigos CIE-10 para diagnósticos, no texto libre.

**Brecha:** Los campos de diagnóstico son texto libre, no códigos CIE-10 estructurados.

---

## Términos Geográficos

### **Entidad Federativa** (State)
**Ubicación:** 
- Catálogo: `backend/catalogs/normalized/enitades_federativas.csv`
- Uso actual: En `CentroTrabajo.estado` como texto libre

**Equivalencia NOM-024:** Debe usar códigos INEGI de 2 dígitos (ej: "01" = Aguascalientes).

**Brecha:** Actualmente es texto libre, no código INEGI.

---

### **Municipio**
**Ubicación:**
- Catálogo: `backend/catalogs/normalized/municipios.csv`
- Uso actual: En `CentroTrabajo.municipio` como texto libre

**Equivalencia NOM-024:** Debe usar códigos INEGI de 3 dígitos.

**Brecha:** Actualmente es texto libre, no código INEGI.

---

### **Localidad**
**Ubicación:**
- Catálogo: `backend/catalogs/normalized/localidades.csv`
- Uso actual: NO se usa en el sistema actual

**Equivalencia NOM-024:** Requerido por GIIS para ubicación geográfica completa. Código INEGI de 4 dígitos.

**Brecha:** No existe campo de localidad en ninguna entidad.

---

## Términos de Catálogos

### **Catálogo** (Catalog)
**Definición:** Lista de valores controlados (códigos y descripciones) para validación de datos.

**Ubicación:** `backend/catalogs/normalized/*.csv`

**Catálogos disponibles:**
- `diagnosticos.csv` - CIE-10
- `codigos_postales.csv` - Códigos postales
- `enitades_federativas.csv` - Estados
- `municipios.csv` - Municipios
- `localidades.csv` - Localidades
- `establecimientos_salud.csv` - CLUES
- `cat_nacionalidades.csv` - Nacionalidades
- `cat_religiones.csv` - Religiones
- `formacion_academica.csv` - Formación académica
- `lenguas_indigenas.csv` - Lenguas indígenas

**Equivalencia NOM-024:** Los catálogos son "Master Data" obligatorios. No se permite texto libre cuando existe catálogo.

**Brecha:** Los catálogos existen como archivos CSV pero NO están integrados como servicios de validación activos en el backend.

---

## Resumen de Mapeo NOM-024

| Término Sistema | Equivalente NOM-024 | Estado |
|----------------|---------------------|--------|
| Trabajador | Paciente | ✅ Existente (brechas en datos) |
| Documento Médico | Documento Estructurado | ⚠️ Parcial (falta estado finalizado, CIE-10) |
| NotaMedica | Consulta Externa (GIIS-B015) | ⚠️ Parcial (falta estructura GIIS) |
| ProveedorSalud | Prestador de Servicios | ⚠️ Parcial (falta CLUES) |
| Establecimiento | Establecimiento (CLUES) | ❌ No existe |
| MedicoFirmante | Profesional de la Salud | ⚠️ Parcial (falta CURP profesional) |
| CURP | CURP (obligatorio) | ⚠️ Existe pero opcional |
| CLUES | CLUES (obligatorio) | ❌ No existe |
| CIE-10 | CIE-10 (obligatorio) | ❌ No usado (texto libre) |
| Folio Interno | Folio (GIIS) | ❌ No existe |

**Leyenda:**
- ✅ = Existente y correcto
- ⚠️ = Parcialmente implementado (tiene brechas)
- ❌ = No existe o no cumple

