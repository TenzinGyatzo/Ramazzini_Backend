/**
 * Feature flag: administración de catálogos (GUI / API admin).
 * Activar solo durante ventana de verificación SIRES: CATALOG_ADMIN_ENABLED=true
 */
export const catalogAdminConfig = {
  get enabled(): boolean {
    return process.env.CATALOG_ADMIN_ENABLED === 'true';
  },
};
