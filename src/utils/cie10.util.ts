/**
 * CIE-10 Code Extraction Utility
 *
 * Helper functions for extracting and normalizing CIE-10 diagnosis codes
 * from various input formats.
 */

/**
 * Extracts the base CIE-10 code from various input formats
 *
 * Examples:
 * - "C530" → "C530"
 * - "C530 - DESCRIPTION" → "C530"
 * - "C53" → "C53"
 * - "A30 - LEPRA [ENFERMEDAD DE HANSEN]" → "A30"
 *
 * @param input - CIE-10 code in any format (with or without description)
 * @returns Normalized CIE-10 code (uppercase, trimmed) or empty string if invalid
 */
export function extractCIE10Code(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove description if present (format: "CODE - DESCRIPTION")
  const codePart = input.includes(' - ')
    ? input.split(' - ')[0].trim()
    : input.trim();

  // Extract only the code part (before any space if no " - " separator)
  const code = codePart.split(/\s+/)[0].trim().toUpperCase();

  // Validate basic CIE-10 format: Letter + digits (at least 3 chars: A00, C53, etc.)
  if (code.length < 3 || !/^[A-Z][0-9]/.test(code)) {
    return '';
  }

  return code;
}

/**
 * Gets the 3-character prefix from a CIE-10 code
 *
 * Examples:
 * - "C530" → "C53"
 * - "C53" → "C53"
 * - "A30" → "A30"
 *
 * @param code - CIE-10 code (already normalized)
 * @returns 3-character prefix or null if invalid
 */
export function getCIE10Prefix(code: string): string | null {
  if (!code || code.length < 3) {
    return null;
  }

  // CIE-10 format: Letter + 2 digits minimum
  const match = code.match(/^([A-Z][0-9]{2})/);
  return match ? match[1] : null;
}
