# Administración de catálogos (CSV)

## Feature flag y régimen (verificación SIRES)

La GUI y la API de administración están **desactivadas por defecto**. Actívalas solo durante la ventana de verificación SIRES. Además, el tenant debe estar en régimen **`SIRES_NOM024`**. La lectura de catálogos (validaciones clínicas, autocompletados) **no** depende de este flag ni del régimen.

| Entorno | Variable | Valor activo |
|---------|----------|--------------|
| Backend | `CATALOG_ADMIN_ENABLED` | `true` |
| Frontend (build Vite) | `VITE_CATALOG_ADMIN_ENABLED` | `true` |

**Condición de acceso completa:** `CATALOG_ADMIN_ENABLED=true` **AND** régimen `SIRES_NOM024` **AND** rol Principal o Administrador.

Mantén **ambas** variables de entorno con el mismo valor en producción. Tras cambiar el backend, reinicia el proceso Node. Tras cambiar el frontend, vuelve a compilar/desplegar.

Si el flag está desactivado o el proveedor no es SIRES: la API admin responde **403**; el menú y la ruta `/admin/catalogos` no se muestran.

Config: [`config/catalog-admin.config.ts`](config/catalog-admin.config.ts).

## Fuente de verdad

Los catálogos viven en `backend/catalogs/normalized/*.csv`. **No** se persisten en MongoDB.

El proceso Node debe tener permisos de lectura/escritura sobre:

- `catalogs/normalized/`
- `catalogs/normalized/backups/` (creada automáticamente)

## Flujos

### Actualización masiva (recomendado)

1. Normalizar el release oficial a CSV (misma estructura de columnas que el archivo actual).
2. En la UI **Catálogos NOM-024** → **Importar y reemplazar CSV**, o `POST /api/catalogs/admin/:catalogType/import` (multipart, campo `file`).
3. Antes de sobrescribir se guarda copia en `backups/{catalogType}_{timestamp}.csv`.
4. La caché en memoria se recarga automáticamente.

### Corrección puntual (CRUD)

- Alta/edición/baja vía GUI o API admin reescribe el CSV completo y recarga la caché del tipo afectado.
- En catálogos muy grandes (localidades, CIE-10, CP) preferir import masivo; el CRUD de una fila puede ser lento.

### Solo recargar caché

Si reemplazó un archivo manualmente en el servidor: **Recargar caché** o `POST .../reload-cache`.

## API admin

Prefijo: `/api/catalogs/admin`  
Roles: `Principal`, `Administrador` (JWT Bearer).

| Método | Ruta |
|--------|------|
| GET | `/types` |
| GET | `/:catalogType` (paginado, `q`, `page`, `limit`) |
| GET | `/:catalogType/export` |
| GET | `/:catalogType/:code` |
| POST | `/:catalogType` |
| PATCH | `/:catalogType/:code` |
| DELETE | `/:catalogType/:code` |
| POST | `/:catalogType/import` |
| POST | `/:catalogType/reload-cache` |

Parámetro `catalogType`: valor del enum (`diagnosticos`, `municipios`, `cat_pais`, etc.).

## Auditoría

Acciones registradas en AuditTrail (sin almacenar el CSV):  
`ADMIN_CATALOG_CREATE`, `UPDATE`, `DELETE`, `IMPORT`, `RELOAD`.

## Despliegue

Tras desplegar nuevos CSV por pipeline, reiniciar la app o invocar reload por catálogo para alinear la caché con disco.
