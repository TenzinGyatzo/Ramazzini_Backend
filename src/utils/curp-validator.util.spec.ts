import {
  validateCURPFormat,
  validateCURPCrossCheck,
  Discrepancy,
} from './curp-validator.util';

describe('validateCURPCrossCheck (A1)', () => {
  const mockData = {
    fechaNacimiento: new Date('1990-05-15'),
    sexo: 'Masculino',
    entidadNacimiento: '09', // CDMX
    nombre: 'JUAN',
    primerApellido: 'GARCIA',
    segundoApellido: 'LOPEZ',
  };

  // GARCIA LOPEZ JUAN, 1990-05-15, H, DF — iniciales GALJ, consonantes RPN
  const curpGarciaLopezJuan = 'GALJ900515HDFRPN08';

  it('debe retornar isValid=true para CURP genérica', () => {
    const result = validateCURPCrossCheck('XXXX999999XXXXXX99', mockData);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe pasar validación para caso real correcto CXGE941130HJCRND07', () => {
    const curp = 'CXGE941130HJCRND07';
    const dataCorrecta = {
      fechaNacimiento: '1994-11-30' as any, // String ISO
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO', // Nombre completo
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };
    const result = validateCURPCrossCheck(curp, dataCorrecta);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe aceptar iniciales COGE o CXGE con palabra inconveniente', () => {
    const dataCorrecta = {
      fechaNacimiento: '1994-11-30' as any,
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };
    expect(validateCURPCrossCheck('COGE941130HJCRND07', dataCorrecta).isValid).toBe(
      true,
    );
    expect(validateCURPCrossCheck('CXGE941130HJCRND07', dataCorrecta).isValid).toBe(
      true,
    );
  });

  it('debe pasar validación para Salgado Briseño Concepción', () => {
    const curp = 'SABC560626MDFLRN09';
    const data = {
      fechaNacimiento: '1956-06-26',
      sexo: 'Femenino',
      entidadNacimiento: '09',
      nombre: 'Concepción',
      primerApellido: 'Salgado',
      segundoApellido: 'Briseño',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe pasar validación con entidadNacimiento como código INEGI (14)', () => {
    const curp = 'CXGE941130HJCRND07';
    const data = {
      fechaNacimiento: new Date('1994-11-30'),
      sexo: 'Masculino',
      entidadNacimiento: '14', // Código INEGI
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe pasar validación con entidadNacimiento como código CURP (JC)', () => {
    const curp = 'CXGE941130HJCRND07';
    const data = {
      fechaNacimiento: new Date('1994-11-30'),
      sexo: 'Masculino',
      entidadNacimiento: 'JC', // Código CURP directo
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe retornar isValid=false si fechaNacimiento no coincide', () => {
    const dataIncorrecta = {
      ...mockData,
      fechaNacimiento: new Date('1991-05-15'), // Año diferente (910515)
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIncorrecta);
    expect(result.isValid).toBe(false);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    const fechaDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'fechaNacimiento',
    );
    expect(fechaDiscrepancy).toBeDefined();
    expect(fechaDiscrepancy?.expected).toBe('910515'); // Fecha esperada de los datos
    expect(fechaDiscrepancy?.gotFromCurp).toBe('900515'); // Fecha en la CURP
  });

  it('debe retornar discrepancy estructurada para fecha incorrecta', () => {
    const dataIncorrecta = {
      ...mockData,
      fechaNacimiento: new Date('1990-05-16'), // Día diferente
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIncorrecta);
    expect(result.isValid).toBe(false);
    const fechaDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'fechaNacimiento',
    );
    expect(fechaDiscrepancy).toBeDefined();
    expect(fechaDiscrepancy?.field).toBe('fechaNacimiento');
    expect(fechaDiscrepancy?.expected).toBe('900516');
    expect(fechaDiscrepancy?.gotFromCurp).toBe('900515');
  });

  it('debe retornar isValid=false si sexo no coincide', () => {
    const dataIncorrecta = {
      ...mockData,
      sexo: 'Femenino', // M en CURP vs Femenino
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIncorrecta);
    expect(result.isValid).toBe(false);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    const sexoDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'sexo',
    );
    expect(sexoDiscrepancy).toBeDefined();
    expect(sexoDiscrepancy?.field).toBe('sexo');
    expect(sexoDiscrepancy?.expected).toBe('M');
    expect(sexoDiscrepancy?.gotFromCurp).toBe('H');
  });

  it('debe mapear correctamente variantes de sexo: Hombre → H', () => {
    const data = {
      ...mockData,
      sexo: 'Hombre',
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe mapear correctamente variantes de sexo: M → M (Femenino)', () => {
    const curp = 'GALJ900515MDFRPN08'; // M
    const data = {
      ...mockData,
      sexo: 'M',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe retornar isValid=false si entidadNacimiento no coincide', () => {
    const dataIncorrecta = {
      ...mockData,
      entidadNacimiento: '01', // Aguascalientes (AS)
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIncorrecta);
    expect(result.isValid).toBe(false);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    const entidadDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'entidadNacimiento',
    );
    expect(entidadDiscrepancy).toBeDefined();
    expect(entidadDiscrepancy?.field).toBe('entidadNacimiento');
    expect(entidadDiscrepancy?.expected).toBe('AS'); // Código CURP de Aguascalientes
    expect(entidadDiscrepancy?.gotFromCurp).toBe('DF');
  });

  it('debe mapear correctamente entidadNacimiento: JALISCO → JC', () => {
    const curp = 'CXGE941130HJCRND07'; // JC
    const data = {
      fechaNacimiento: new Date('1994-11-30'),
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe mapear correctamente entidadNacimiento: código INEGI 14 → JC', () => {
    const curp = 'CXGE941130HJCRND07'; // JC
    const data = {
      fechaNacimiento: new Date('1994-11-30'),
      sexo: 'Masculino',
      entidadNacimiento: '14',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe retornar isValid=true si todos los datos coinciden', () => {
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, mockData);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe exigir NE en posiciones 12-13 con entidadNacimiento 88', () => {
    const dataExtranjero = {
      ...mockData,
      entidadNacimiento: '88',
    };
    const mismatch = validateCURPCrossCheck(curpGarciaLopezJuan, dataExtranjero);
    const entidadMismatch = mismatch.discrepancies.find(
      (d) => d.field === 'entidadNacimiento',
    );
    expect(entidadMismatch).toBeDefined();
    expect(entidadMismatch?.expected).toBe('NE');
    expect(entidadMismatch?.gotFromCurp).toBe('DF');

    const curpConNe = 'GALJ900515HNERPN08';
    const match = validateCURPCrossCheck(curpConNe, dataExtranjero);
    expect(
      match.discrepancies.filter((d) => d.field === 'entidadNacimiento'),
    ).toHaveLength(0);
  });

  it('debe exigir NE en posiciones 12-13 con entidadNacimiento NE o 00', () => {
    const curpConNe = 'GALJ900515HNERPN08';
    for (const entidadNacimiento of ['NE', '00'] as const) {
      const data = { ...mockData, entidadNacimiento };
      const mismatch = validateCURPCrossCheck(curpGarciaLopezJuan, data);
      expect(
        mismatch.discrepancies.find((d) => d.field === 'entidadNacimiento'),
      ).toMatchObject({ expected: 'NE', gotFromCurp: 'DF' });

      const match = validateCURPCrossCheck(curpConNe, data);
      expect(
        match.discrepancies.filter((d) => d.field === 'entidadNacimiento'),
      ).toHaveLength(0);
    }
  });

  it('debe retornar isValid=false si CURP tiene formato inválido', () => {
    const curpInvalida = 'INVALID';
    const result = validateCURPCrossCheck(curpInvalida, mockData);
    expect(result.isValid).toBe(false);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    expect(result.discrepancies[0].field).toBe('fechaNacimiento');
  });

  it('debe validar correctamente fecha con mes y día de un solo dígito', () => {
    const curp = 'GALJ900105HDFRPN08'; // 1990-01-05
    const data = {
      ...mockData,
      fechaNacimiento: new Date('1990-01-05'),
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe validar correctamente sexo Femenino', () => {
    const curp = 'GALJ900515MDFRPN08'; // M (Mujer)
    const data = {
      ...mockData,
      sexo: 'Femenino',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe permitir entidadNacimiento vacío sin validar', () => {
    const dataSinEntidad = {
      ...mockData,
      entidadNacimiento: undefined,
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataSinEntidad);
    expect(
      result.discrepancies.filter((d) => d.field === 'entidadNacimiento'),
    ).toHaveLength(0);
  });

  it('debe retornar múltiples discrepancias cuando varios campos fallan', () => {
    const dataIncorrecta = {
      fechaNacimiento: new Date('1991-06-20'),
      sexo: 'Femenino',
      entidadNacimiento: '01',
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIncorrecta);
    expect(result.isValid).toBe(false);
    expect(result.discrepancies.length).toBeGreaterThanOrEqual(3);

    const fechaDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'fechaNacimiento',
    );
    const sexoDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'sexo',
    );
    const entidadDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'entidadNacimiento',
    );

    expect(fechaDiscrepancy).toBeDefined();
    expect(sexoDiscrepancy).toBeDefined();
    expect(entidadDiscrepancy).toBeDefined();

    expect(fechaDiscrepancy?.expected).toBe('910620');
    expect(fechaDiscrepancy?.gotFromCurp).toBe('900515');

    expect(sexoDiscrepancy?.expected).toBe('M');
    expect(sexoDiscrepancy?.gotFromCurp).toBe('H');

    expect(entidadDiscrepancy?.expected).toBe('AS');
    expect(entidadDiscrepancy?.gotFromCurp).toBe('DF');
  });

  it('debe manejar fecha como string ISO correctamente', () => {
    const data = {
      ...mockData,
      fechaNacimiento: '1990-05-15' as any,
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe retornar isValid=false si iniciales no coinciden', () => {
    const dataIncorrecta = {
      ...mockData,
      primerApellido: 'RODRIGUEZ',
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIncorrecta);
    expect(result.isValid).toBe(false);
    const inicialesDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'iniciales',
    );
    expect(inicialesDiscrepancy).toBeDefined();
    expect(inicialesDiscrepancy?.gotFromCurp).toBe('GALJ');
  });

  it('debe retornar isValid=false si consonantes internas no coinciden', () => {
    const dataIncorrecta = {
      ...mockData,
      nombre: 'PEDRO',
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIncorrecta);
    expect(result.isValid).toBe(false);
    const consonantesDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'consonantesInternas',
    );
    expect(consonantesDiscrepancy).toBeDefined();
    expect(consonantesDiscrepancy?.expected).toBe('RPD');
    expect(consonantesDiscrepancy?.gotFromCurp).toBe('RPN');
  });

  it('debe validar homoclave dígito para nacidos antes del 2000', () => {
    const curpConHomoclaveLetra = 'GALJ900515HDFRPNA8';
    const result = validateCURPCrossCheck(curpConHomoclaveLetra, mockData);
    expect(result.isValid).toBe(false);
    const homoclaveDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'homoclave',
    );
    expect(homoclaveDiscrepancy).toBeDefined();
    expect(homoclaveDiscrepancy?.expected).toBe('0-9');
    expect(homoclaveDiscrepancy?.gotFromCurp).toBe('A');
  });

  it('debe validar homoclave letra A-J para nacidos desde el 2000', () => {
    const curp = 'GALJ000115HDFRPNA8';
    const data = {
      ...mockData,
      fechaNacimiento: new Date('2000-01-15'),
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe rechazar homoclave dígito para nacidos desde el 2000', () => {
    const curp = 'GALJ000115HDFRPN08';
    const data = {
      ...mockData,
      fechaNacimiento: new Date('2000-01-15'),
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(false);
    const homoclaveDiscrepancy = result.discrepancies.find(
      (d) => d.field === 'homoclave',
    );
    expect(homoclaveDiscrepancy?.expected).toBe('A-J');
    expect(homoclaveDiscrepancy?.gotFromCurp).toBe('0');
  });

  it('debe omitir validación de nombres si faltan primerApellido o nombre', () => {
    const dataSinNombres = {
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataSinNombres);
    expect(result.isValid).toBe(true);
    expect(
      result.discrepancies.filter(
        (d) => d.field === 'iniciales' || d.field === 'consonantesInternas',
      ),
    ).toHaveLength(0);
  });

  it('debe cruzar sinApellidos cuando hay nombre y ambos apellidos vacíos', () => {
    const curp = 'XXXJ900515HDFXXN08';
    const data = {
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
      nombre: 'JUAN',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(
      result.discrepancies.filter(
        (d) => d.field === 'iniciales' || d.field === 'consonantesInternas',
      ),
    ).toHaveLength(0);
  });

  it('debe rechazar CURP con apellidos reales si demografía queda sin apellidos', () => {
    const data = {
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
      nombre: 'JUAN',
    };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, data);
    expect(result.isValid).toBe(false);
    expect(
      result.discrepancies.some((d) => d.field === 'iniciales'),
    ).toBe(true);
    expect(
      result.discrepancies.some((d) => d.field === 'consonantesInternas'),
    ).toBe(true);
  });

  it('debe aceptar segundo apellido vacío con X en posiciones 3 y 15', () => {
    const curp = 'GAXJ900515HDFRXN08';
    const data = {
      ...mockData,
      segundoApellido: '',
    };
    const result = validateCURPCrossCheck(curp, data);
    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it('debe aceptar CURP con X en posición 11 (sexo no binario RENAPO)', () => {
    expect(validateCURPFormat('GALJ900515XDFRPN08')).toBe(true);
  });

  it('no debe cruzar sexo CURP cuando trabajador es Intersexual (CURP con H)', () => {
    const dataIntersexual = { ...mockData, sexo: 'Intersexual' };
    const result = validateCURPCrossCheck(curpGarciaLopezJuan, dataIntersexual);
    expect(
      result.discrepancies.filter((d) => d.field === 'sexo'),
    ).toHaveLength(0);
  });

  it('no debe cruzar sexo CURP cuando trabajador es Intersexual (CURP con M)', () => {
    const curpMujer = 'SABC560626MDFLRN09';
    const data = {
      fechaNacimiento: '1956-06-26',
      sexo: 'Intersexual',
      entidadNacimiento: '09',
      nombre: 'Concepción',
      primerApellido: 'Salgado',
      segundoApellido: 'Briseño',
    };
    const result = validateCURPCrossCheck(curpMujer, data);
    expect(
      result.discrepancies.filter((d) => d.field === 'sexo'),
    ).toHaveLength(0);
  });

  it('debe cruzar pos. 11 con sexoCURP=3 exigiendo X', () => {
    const curpHombre = 'GALJ900515HDFRPN08';
    const result = validateCURPCrossCheck(curpHombre, {
      ...mockData,
      sexoCURP: 3,
    });
    expect(result.isValid).toBe(false);
    expect(result.discrepancies.find((d) => d.field === 'sexo')?.expected).toBe(
      'X',
    );
  });

  it('debe priorizar sexoCURP sobre sexo biológico en cruce', () => {
    const curpMujer = 'SABC560626MDFLRN09';
    const result = validateCURPCrossCheck(curpMujer, {
      fechaNacimiento: '1956-06-26',
      sexo: 'Masculino',
      sexoCURP: 2,
      entidadNacimiento: '09',
      nombre: 'Concepción',
      primerApellido: 'Salgado',
      segundoApellido: 'Briseño',
    });
    expect(result.isValid).toBe(true);
  });
});
