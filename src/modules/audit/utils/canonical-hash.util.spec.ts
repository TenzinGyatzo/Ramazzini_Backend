import { computeCanonicalHash, toCanonicalJson } from './canonical-hash.util';
import type { AuditEventCanonicalPayload } from '../interfaces/audit-event-canonical.interface';

describe('canonical-hash.util', () => {
  const baseEvent: AuditEventCanonicalPayload = {
    proveedorSaludId: 'proveedor1',
    actorId: 'user1',
    timestamp: '2026-02-06T12:00:00.000Z',
    actionType: 'DOC_FINALIZE',
    resourceType: 'notaMedica',
    resourceId: 'doc123',
    payload: null,
  };

  it('same payload produces same hash', () => {
    const a = computeCanonicalHash(baseEvent);
    const b = computeCanonicalHash(baseEvent);
    expect(a.hashEvento).toBe(b.hashEvento);
  });

  it('different payload produces different hash', () => {
    const a = computeCanonicalHash(baseEvent);
    const other: AuditEventCanonicalPayload = {
      ...baseEvent,
      resourceId: 'doc456',
    };
    const b = computeCanonicalHash(other);
    expect(a.hashEvento).not.toBe(b.hashEvento);
  });

  it('with previousEventHash sets hashEventoAnterior', () => {
    const prev = 'abc123def456';
    const result = computeCanonicalHash(baseEvent, prev);
    expect(result.hashEventoAnterior).toBe(prev);
  });

  it('without previousEventHash sets hashEventoAnterior to null', () => {
    const result = computeCanonicalHash(baseEvent);
    expect(result.hashEventoAnterior).toBeNull();
  });

  it('toCanonicalJson produces stable key order', () => {
    const json = toCanonicalJson(baseEvent);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([
      'proveedorSaludId',
      'actorId',
      'timestamp',
      'actionType',
      'resourceType',
      'resourceId',
      'payload',
    ]);
  });
});
