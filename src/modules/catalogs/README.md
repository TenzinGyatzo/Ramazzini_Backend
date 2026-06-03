# Catalog Integration Service

Servicio para cargar, cachear y validar catálogos obligatorios de NOM-024-SSA3-2012.

## Arquitectura

El servicio maneja dos categorías de catálogos:

| Categoría | Cantidad | Comportamiento |
|-----------|----------|----------------|
| **Base** | 8 | Requeridos - errores si faltan |
| **GIIS** | 8 | Opcionales - warnings si faltan, validación bypassed |

### Estadísticas de Carga

Al iniciar, el servicio muestra:
```
Base catalogs loaded: X/8
GIIS optional catalogs loaded: Y/8
```

## Uso

### Inyectar el servicio

```typescript
import { CatalogsService } from '../catalogs/catalogs.service';

constructor(private readonly catalogsService: CatalogsService) {}
```

### Validar códigos CIE-10

```typescript
const isValid = await this.catalogsService.validateCIE10('A00', 'M', 25);
```

### Validar CLUES

```typescript
const isValid = await this.catalogsService.validateCLUES('ASCIJ000012');
```

### Validar códigos INEGI

```typescript
// Validar estado
const isValidEstado = await this.catalogsService.validateINEGI('estado', '01');

// Validar municipio (con código de estado padre)
const isValidMunicipio = await this.catalogsService.validateINEGI('municipio', '001', '01');

// Validar localidad (con código de municipio padre)
const isValidLocalidad = await this.catalogsService.validateINEGI('localidad', '0001', '01-001');
```

### Validar códigos GIIS-B013 (Opcionales)

```typescript
// Returns GIISValidationResult { valid: boolean, catalogLoaded: boolean, message?: string }
const result = this.catalogsService.validateGIISSitioOcurrencia(1);
const result = this.catalogsService.validateGIISAgenteLesion(10);
const result = this.catalogsService.validateGIISAreaAnatomica(3);
const result = this.catalogsService.validateGIISConsecuencia(2);

// Si catálogo no está cargado: result.valid = true (non-blocking), result.catalogLoaded = false
```

### Validar códigos GIIS-B019 (Opcionales)

```typescript
const result = this.catalogsService.validateGIISTipoPersonal(1);
const result = this.catalogsService.validateGIISServiciosDet('01');
const result = this.catalogsService.validateGIISAfiliacion(2);
const result = this.catalogsService.validateGIISPais('MX');
```

### Buscar entradas

```typescript
const results = await this.catalogsService.searchCatalog(CatalogType.CIE10, 'cólera', 10);
```

### Obtener entrada por código

```typescript
const entry = await this.catalogsService.getCatalogEntry(CatalogType.CIE10, 'A00');
```

### Obtener estadísticas de catálogos

```typescript
const stats = this.catalogsService.getCatalogStats();
// { baseLoaded: 10, baseTotal: 10, giisLoaded: 2, giisTotal: 8, loadedCatalogs: [...] }
```

## Catálogos Base (8) - Requeridos

| Catálogo | Archivo | Fuente |
|----------|---------|--------|
| CIE-10 | diagnosticos_sis.csv | CIE-10 |
| CLUES | establecimiento_de_salud_sis.csv | CLUES |
| Entidades Federativas | enitades_federativas.csv | INEGI |
| Municipios | municipios.csv | INEGI |
| Localidades | localidades.csv | INEGI |
| Códigos Postales | codigos_postales.csv | INEGI |
| Escolaridad | escolaridad.csv | GIIS / SEP |

## Catálogos GIIS (8) - Opcionales

Los siguientes catálogos requeridos por GIIS son **no públicos** por parte de DGIS.
El sistema utiliza validación best-effort (tipo de dato + límites básicos) sin
enumeración estricta de catálogo.

### GIIS-B013 (Lesiones) - 4 catálogos

| Catálogo | Archivo | Descripción |
|----------|---------|-------------|
| `SITIO_OCURRENCIA` | cat_sitio_ocurrencia.csv | Lugar donde ocurrió el evento |
| `AGENTE_LESION` | cat_agente_lesion.csv | Objeto/mecanismo de lesión |
| `AREA_ANATOMICA` | cat_area_anatomica.csv | Zona corporal afectada |
| `CONSECUENCIA` | cat_consecuencia.csv | Resultado físico de la lesión |

### GIIS-B019 (Detecciones) - 4 catálogos

| Catálogo | Archivo | Descripción |
|----------|---------|-------------|
| `TIPO_PERSONAL` | cat_tipo_personal.csv | Tipo de personal de salud |
| `SERVICIOS_DET` | cat_servicios_det.csv | Servicios de detección |
| `AFILIACION` | cat_afiliacion.csv | Derechohabiencia |
| `PAIS` | cat_pais.csv | Países de procedencia |

### Comportamiento cuando falta un catálogo GIIS

1. **Startup**: El servicio continúa normalmente, emite WARN (no ERROR)
2. **Validación**: Retorna `{ valid: true, catalogLoaded: false }` (non-blocking)
3. **Logging**: Un solo warning por tipo de catálogo por proceso (evita spam)

### Ejemplo de uso defensivo

```typescript
const result = this.catalogsService.validateGIISSitioOcurrencia(sitioCode);

if (!result.catalogLoaded) {
  // Catálogo GIIS no disponible - continuar con validación básica
  this.logger.debug('GIIS catalog not loaded, using basic validation');
}

if (!result.valid && result.catalogLoaded) {
  // Código inválido según catálogo cargado
  throw new BadRequestException(`Sitio de ocurrencia inválido: ${sitioCode}`);
}
```

## Administración (CSV en servidor)

Ver [ADMIN_CATALOGOS.md](./ADMIN_CATALOGOS.md) para la API y la UI de gestión (`/admin/catalogos`).

## Documentación Relacionada

- `docs/nom-024/GIIS_B013_LESION_IMPLEMENTATION.md`
- `docs/nom-024/GIIS_B019_DETECCION_IMPLEMENTATION.md`

**Nota:** La falta de catálogos GIIS es una dependencia regulatoria externa, no una brecha técnica.
Cuando DGIS publique estos catálogos, se activará la validación estricta automáticamente.

