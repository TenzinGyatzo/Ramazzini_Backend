# Configuración del módulo DGIS para cifrado GIIS

Para que los archivos .CIF sean compatibles con SINBA 2.0, use el módulo oficial de la DGIS.

## Pasos

### 1. Descargar Transferencia.zip

1. Ir a [GOBI](http://gobi.salud.gob.mx) → Guías → Manuales → Cifrado
2. Descargar "Módulo de cifrado" (Transferencia.zip)
3. Descomprimir: obtendrá `cifrado.jar` y `transferencia.jks`

### 2. Crear estructura de directorios

Crear una carpeta (por ejemplo `C:\cifrado` o `backend/tools/dgis`):

```
{carpeta}/
├── cifrado.jar
└── keystore/
    └── transferencia.jks
```

### 3. Configurar variable de entorno

En `.env`:

```env
DGIS_CIFRADO_DIR=C:\cifrado
```

O si usa una ruta relativa al proyecto:

```env
DGIS_CIFRADO_DIR=./tools/dgis
```

### 4. Requisitos

- **Java** instalado en el servidor donde corre el backend
- Verificar: `java -version`

### 5. Prioridad

- Si `DGIS_CIFRADO_DIR` está configurado y contiene `cifrado.jar` y `keystore/transferencia.jks`, se usa el módulo DGIS.
- Si no, se usa `GIIS_3DES_KEY_BASE64` (cifrado Node; puede no ser compatible con SINBA).

## Referencia

- Manual de Usuario de Cifrado DGIS (GOBI, marzo 2022)
- `docs/nom-024/giis_encryption_spec.md`
