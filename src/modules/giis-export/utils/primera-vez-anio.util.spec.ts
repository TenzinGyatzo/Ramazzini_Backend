import { Types } from 'mongoose';
import {
  esPrimeraVezAnioSiNoHayOtraFinalizada,
  valorPrimeraVezAnioSegunExistencia,
} from './primera-vez-anio.util';

const idA = new Types.ObjectId('507f1f77bcf86cd799439011');
const idB = new Types.ObjectId('507f1f77bcf86cd799439012');

describe('esPrimeraVezAnioSiNoHayOtraFinalizada', () => {
  it('es true si no hay notas finalizadas', () => {
    expect(
      esPrimeraVezAnioSiNoHayOtraFinalizada({
        existingIds: [],
      }),
    ).toBe(true);
  });

  it('es false si ya existe otra finalizada, aunque la candidata sea clínicamente anterior', () => {
    expect(
      esPrimeraVezAnioSiNoHayOtraFinalizada({
        existingIds: [idB],
      }),
    ).toBe(false);
    expect(valorPrimeraVezAnioSegunExistencia(true)).toBe(0);
  });

  it('es false si ya hay una nota del mismo día', () => {
    expect(
      esPrimeraVezAnioSiNoHayOtraFinalizada({
        existingIds: [idA],
      }),
    ).toBe(false);
  });

  it('al previsualizar la propia nota concluida, se ignora a sí misma', () => {
    expect(
      esPrimeraVezAnioSiNoHayOtraFinalizada({
        existingIds: [idA],
        candidateId: idA.toString(),
      }),
    ).toBe(true);
  });

  it('no promociona a otra nota: si la de 1 se anula, las que ya eran 0 siguen 0', () => {
    expect(valorPrimeraVezAnioSegunExistencia(true)).toBe(0);
    expect(
      esPrimeraVezAnioSiNoHayOtraFinalizada({
        existingIds: [idB],
        candidateId: idA.toString(),
      }),
    ).toBe(false);
  });
});

describe('valorPrimeraVezAnioSegunExistencia', () => {
  it('primera concluida del año recibe 1; las siguientes reciben 0', () => {
    expect(valorPrimeraVezAnioSegunExistencia(false)).toBe(1);
    expect(valorPrimeraVezAnioSegunExistencia(true)).toBe(0);
  });
});
