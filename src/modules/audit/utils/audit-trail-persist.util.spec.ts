import { isAuditTrailPersistEnabled } from './audit-trail-persist.util';

describe('isAuditTrailPersistEnabled', () => {
  it('returns true for "true"', () => {
    expect(isAuditTrailPersistEnabled('true')).toBe(true);
  });

  it('returns true for "1"', () => {
    expect(isAuditTrailPersistEnabled('1')).toBe(true);
  });

  it('returns false for "false"', () => {
    expect(isAuditTrailPersistEnabled('false')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAuditTrailPersistEnabled(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAuditTrailPersistEnabled('')).toBe(false);
  });

  it('returns false for "TRUE" (case-sensitive)', () => {
    expect(isAuditTrailPersistEnabled('TRUE')).toBe(false);
  });
});
