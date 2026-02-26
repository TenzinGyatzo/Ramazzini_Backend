# Phase 6: Cifrado de informes GIIS (txt → .cif) — Context

**Gathered:** 2026-02-26  
**Status:** Ready for planning

---

## Phase Boundary

Los informes GIIS que actualmente se generan en .txt deben cifrarse para tener extensión .cif y empaquetarse en ZIP, manteniendo la descarga de .txt como opción. El usuario obtiene ambas opciones al completar el batch: descarga .TXT y descarga ZIP (con .CIF dentro). **Alcance:** solo guías **CEX** y **LES** (CDT fuera de alcance de esta fase).

---

## Implementation Decisions

### Formato de entrega

- **1 ZIP por guía** (CEX, LES). Cada ZIP contiene un solo archivo: el .CIF correspondiente (ej. `LES-DFSSA-2201.CIF`).
- El usuario puede descargar **TXT** y **ZIP** — ambas opciones siempre disponibles.
- **CDT eliminado del alcance:** el sistema soporta únicamente CEX y LES para esta fase.
- Triada de archivos con mismo nombre base: `[BASENAME].TXT`, `[BASENAME].CIF`, `[BASENAME].ZIP` (ej. `LES-DFSSA-2201.TXT`, `LES-DFSSA-2201.CIF`, `LES-DFSSA-2201.ZIP`).

### Momento del cifrado

- Cifrado **automático** al completar el batch.
- No existe paso separado "build-deliverable": al terminar la generación, TXT + CIF + ZIP están listos.
- Ambos enlaces de descarga (TXT y ZIP) disponibles de inmediato tras completar el batch.

### Gate GIIS_ENCRYPTION_VALIDATED

- **Eliminar** `GIIS_ENCRYPTION_VALIDATED` como gate funcional.
- El cifrado es **obligatorio** y siempre activo.
- Siempre generar TXT + CIF + ZIP.
- La UI muestra siempre ambas opciones de descarga.

### Experiencia de usuario en la descarga

- **Etiquetas de enlaces:** "CEX Cifrado", "CEX.txt", "LES Cifrado", "LES.txt" (2 enlaces por guía, 4 en total).
- **Prioridad:** ZIP (Cifrado) como opción principal; TXT como secundaria.
- **Avisos:** ninguno.
- **Nombres de archivo:** mismo basename para TXT, CIF y ZIP; solo cambia la extensión.

### Claude's Discretion

- Diseño exacto del layout de los enlaces (orden, espaciado).
- Si hay que exponer un endpoint para descarga directa de .CIF (además del ZIP) para casos futuros.
- Adaptación de tests existentes (CDT, gate, build-deliverable como paso separado).

---

## Specific Ideas

- Referencia actual: enlaces "Descargar CEX" / "Descargar LES" → reemplazar por "CEX Cifrado" + "CEX.txt" y "LES Cifrado" + "LES.txt".
- Naming oficial ya implementado en Phase 2: `getOfficialBaseName`, `getOfficialFileName` para TXT, CIF, ZIP.
- Cifrado existente: `GiisCryptoService.encryptToCif`, `createZipWithCif`.

---

## Deferred Ideas

- **CDT:** Fuera de alcance. Si se requiere en el futuro, será otra fase.
- **Validación con DGIS:** Phase 2 documentó "Validación pendiente DGIS" en giis_encryption_spec.md; el gate se elimina pero la documentación puede mantenerse como referencia histórica.

---

*Phase: 06-cifrado-informes-giis-txt-a-cif*  
*Context gathered: 2026-02-26*
