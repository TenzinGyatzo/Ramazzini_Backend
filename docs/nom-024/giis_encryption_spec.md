# Especificación de cifrado GIIS (.CIF)

**Fecha:** 2026-02  
**Estado:** Compatible con SINBA 2.0 vía módulo DGIS (cifrado.jar).

## Modos de cifrado

### 1. Módulo DGIS (recomendado, compatible con SINBA)

Usa el módulo oficial de la DGIS (`cifrado.jar` + `transferencia.jks`). Descarga desde [GOBI](http://gobi.salud.gob.mx) → Guías → Manuales → Cifrado.

**Configuración:**

```env
DGIS_CIFRADO_DIR=C:\cifrado
```

Estructura requerida:
- `{DGIS_CIFRADO_DIR}/cifrado.jar`
- `{DGIS_CIFRADO_DIR}/keystore/transferencia.jks`

**Requisitos:** Java instalado en el servidor. El backend invoca `java -jar cifrado.jar <archivo.txt> keystore/ ""` (el JAR requiere: nombre del archivo, directorio del keystore, y tercer argumento vacío).

### 2. Cifrado Node (alternativa)

Si `DGIS_CIFRADO_DIR` no está configurado, se usa el cifrado 3DES en Node con `GIIS_3DES_KEY_BASE64` (24 bytes base64). **Nota:** Puede no ser compatible con SINBA; validar con DGIS.

```env
GIIS_3DES_KEY_BASE64=<clave-24-bytes-base64>
```

## Algoritmo (modo Node)

- **Cifrado:** 3DES en modo CBC.
- **Identificador Node.js:** `des-ede3-cbc`.
- **IV:** 8 bytes. (Origen: aleatorio por cifrado o fijo según especificación DGIS; pendiente de validación.)
- **Clave:** 24 bytes (192 bits). **Solo desde configuración segura** (variable de entorno o secret); nunca hardcodeada en código de producción.
- **Padding:** PKCS7 (comportamiento por defecto de `crypto.createCipheriv`).

## Formato .CIF

El archivo `.CIF` contiene el ciphertext binario (salida del cifrado 3DES del contenido TXT en encoding Windows-1252).
