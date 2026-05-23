/**
 * NOM-024 Phase 1 Compliance Test Suite
 *
 * This module exports all NOM-024 test utilities and fixtures
 * for use in both unit and integration tests.
 *
 * Test Files:
 * - catalogs.nom024.spec.ts      (Tasks 1, 12, 14)
 * - curp-validation.nom024.spec.ts (Tasks 3, 9)
 * - name-validation.nom024.spec.ts (Task 10)
 * - vital-signs.nom024.spec.ts   (Task 11)
 * - document-state.nom024.spec.ts (Tasks 6, 7)
 * - lesion-giis-b013.nom024.spec.ts (Tasks 12, 13)
 * - deteccion-giis-b019.nom024.spec.ts (Tasks 14, 15)
 * - giis-export.nom024.spec.ts   (Task 16)
 */

// Re-export fixtures
export * from '../fixtures/trabajador.fixtures';
export * from '../fixtures/proveedor-salud.fixtures';
export * from '../fixtures/professional.fixtures';
export * from '../fixtures/deteccion.fixtures';
export * from '../fixtures/vital-signs.fixtures';

// Re-export utilities
export * from '../utils/mongodb-memory.util';
export * from '../utils/test-module.util';
