/** Shared mock for CexCatalogResolver in GIIS export tests */
export const mockCexCatalogCodes = {
  tipoPersonal: {
    medicoGeneral: 2,
    medicoEspecialista: 4,
    enfermera: 6,
  },
  servicioAtencion: 4,
};

export const mockCexCatalogResolver = {
  getCodes: jest.fn().mockReturnValue(mockCexCatalogCodes),
  getTipoPersonalForRole: jest.fn((role: keyof typeof mockCexCatalogCodes.tipoPersonal) =>
    mockCexCatalogCodes.tipoPersonal[role],
  ),
  getServicioAtencionCex: jest.fn().mockReturnValue(mockCexCatalogCodes.servicioAtencion),
  isReady: jest.fn().mockReturnValue(true),
  refresh: jest.fn(),
  getResolveErrors: jest.fn().mockReturnValue([]),
};
