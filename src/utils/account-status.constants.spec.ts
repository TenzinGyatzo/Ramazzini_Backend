import {
  isAccountStatusLogoutRequest,
  isIssuedBeforeWatermark,
} from './account-status.constants';

describe('isIssuedBeforeWatermark', () => {
  const watermark = new Date('2026-08-30T12:00:00.000Z');

  it('no aplica si no hay watermark (despliegue / nunca suspendido)', () => {
    expect(isIssuedBeforeWatermark(Date.parse('2020-01-01'), null)).toBe(false);
    expect(isIssuedBeforeWatermark(Date.parse('2020-01-01'), undefined)).toBe(
      false,
    );
  });

  it('rechaza emisión anterior al watermark', () => {
    expect(
      isIssuedBeforeWatermark(Date.parse('2026-08-30T11:59:59.000Z'), watermark),
    ).toBe(true);
  });

  it('permite emisión posterior al watermark', () => {
    expect(
      isIssuedBeforeWatermark(Date.parse('2026-08-30T12:00:01.000Z'), watermark),
    ).toBe(false);
  });

  it('rechaza si no se puede probar el instante de emisión', () => {
    expect(isIssuedBeforeWatermark(undefined, watermark)).toBe(true);
    expect(isIssuedBeforeWatermark(null, watermark)).toBe(true);
  });
});

describe('isAccountStatusLogoutRequest', () => {
  it('omite solo POST /auth/users/logout', () => {
    expect(
      isAccountStatusLogoutRequest({
        method: 'POST',
        path: '/auth/users/logout',
      }),
    ).toBe(true);
    expect(
      isAccountStatusLogoutRequest({
        method: 'POST',
        url: '/auth/users/logout?x=1',
      }),
    ).toBe(true);
  });

  it('no omite rutas que solo contienen el substring logout', () => {
    expect(
      isAccountStatusLogoutRequest({
        method: 'POST',
        path: '/auth/users/logout-all',
      }),
    ).toBe(false);
    expect(
      isAccountStatusLogoutRequest({
        method: 'POST',
        path: '/auth/users/logout-history',
      }),
    ).toBe(false);
    expect(
      isAccountStatusLogoutRequest({
        method: 'GET',
        path: '/auth/users/logout',
      }),
    ).toBe(false);
  });
});
