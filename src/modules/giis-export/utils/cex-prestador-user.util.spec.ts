import { Types } from 'mongoose';
import { resolveCexPrestadorUserId } from './cex-prestador-user.util';

const CREATOR = '507f1f77bcf86cd799439011';
const UPDATER = '507f1f77bcf86cd799439012';
const FINALIZER = '507f1f77bcf86cd799439013';

describe('resolveCexPrestadorUserId', () => {
  it('prioriza createdBy aunque existan updatedBy y finalizadoPor', () => {
    expect(
      resolveCexPrestadorUserId({
        createdBy: CREATOR,
        updatedBy: UPDATER,
        finalizadoPor: FINALIZER,
      }),
    ).toBe(CREATOR);
  });

  it('sin createdBy usa updatedBy', () => {
    expect(
      resolveCexPrestadorUserId({
        updatedBy: UPDATER,
        finalizadoPor: FINALIZER,
      }),
    ).toBe(UPDATER);
  });

  it('solo finalizadoPor lo usa', () => {
    expect(
      resolveCexPrestadorUserId({
        finalizadoPor: FINALIZER,
      }),
    ).toBe(FINALIZER);
  });

  it('acepta ObjectId', () => {
    const createdBy = new Types.ObjectId(CREATOR);
    expect(resolveCexPrestadorUserId({ createdBy })).toBe(CREATOR);
  });

  it('acepta ref populada con _id', () => {
    expect(
      resolveCexPrestadorUserId({
        createdBy: { _id: new Types.ObjectId(CREATOR) },
        finalizadoPor: FINALIZER,
      }),
    ).toBe(CREATOR);
  });

  it('sin refs retorna string vacío', () => {
    expect(resolveCexPrestadorUserId({})).toBe('');
    expect(
      resolveCexPrestadorUserId({
        createdBy: null,
        updatedBy: undefined,
        finalizadoPor: null,
      }),
    ).toBe('');
  });
});
