import { describe, expect, it } from 'vitest'

import {
  checkPropsSchema,
  createIncidentPropsSchema,
  createServicePropsSchema,
  incidentPropsSchema,
  servicePropsSchema,
  updateIncidentPropsSchema,
  updateServicePropsSchema,
  uptimeWindowPropsSchema,
} from '../schema.js'

// Valid UUID v4: 14th char must be '4' (version), 17th char must be 8-b (variant).
const VALID_UUID = '11111111-1111-4111-8111-111111111111'

describe('createServicePropsSchema', () => {
  it('accepts a minimal valid service with required fields', () => {
    const result = createServicePropsSchema.safeParse({
      name: 'My Service',
      url: 'https://example.test',
    })
    expect(result.success).toBe(true)
  })

  it('applies defaults: method=GET, expectedStatus=200, timeoutMs=10000, intervalMs=60000, enabled=true', () => {
    const result = createServicePropsSchema.parse({
      name: 'X',
      url: 'https://x.test',
    })
    expect(result.method).toBe('GET')
    expect(result.expectedStatus).toBe(200)
    expect(result.timeoutMs).toBe(10000)
    expect(result.intervalMs).toBe(60000)
    expect(result.enabled).toBe(true)
  })

  it('rejects invalid URLs', () => {
    const result = createServicePropsSchema.safeParse({
      name: 'X',
      url: 'not a url',
    })
    expect(result.success).toBe(false)
  })

  it('rejects method values outside the enum', () => {
    expect(
      createServicePropsSchema.safeParse({
        name: 'X',
        url: 'https://x.test',
        method: 'PATCH',
      }).success,
    ).toBe(false)
  })

  it('accepts method: HEAD or POST in addition to GET', () => {
    for (const m of ['GET', 'HEAD', 'POST']) {
      const result = createServicePropsSchema.safeParse({
        name: 'X',
        url: 'https://x.test',
        method: m,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('updateServicePropsSchema', () => {
  it('allows an empty update body (every field optional)', () => {
    expect(updateServicePropsSchema.safeParse({}).success).toBe(true)
  })

  it('still validates URL when supplied', () => {
    expect(updateServicePropsSchema.safeParse({ url: 'not a url' }).success).toBe(false)
  })

  it('accepts a partial update with just the enabled flag', () => {
    expect(updateServicePropsSchema.safeParse({ enabled: false }).success).toBe(true)
  })
})

describe('servicePropsSchema (full record)', () => {
  it('requires the basePropsSchema fields (id, createdAt, updatedAt)', () => {
    // Missing id should fail.
    const result = servicePropsSchema.safeParse({
      name: 'X',
      url: 'https://x.test',
    })
    expect(result.success).toBe(false)
  })
})

describe('checkPropsSchema', () => {
  it('accepts a valid check result (up)', () => {
    const result = checkPropsSchema.safeParse({
      id: VALID_UUID,
      serviceId: VALID_UUID,
      status: 'up',
      checkedAt: '2026-05-13T10:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects status outside {up, down, degraded}', () => {
    expect(
      checkPropsSchema.safeParse({
        id: VALID_UUID,
        serviceId: VALID_UUID,
        status: 'unknown',
        checkedAt: '2026-05-13T10:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('rejects non-UUID id / serviceId', () => {
    expect(
      checkPropsSchema.safeParse({
        id: 'not-a-uuid',
        serviceId: VALID_UUID,
        status: 'up',
        checkedAt: '2026-05-13T10:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('rejects non-datetime checkedAt', () => {
    expect(
      checkPropsSchema.safeParse({
        id: VALID_UUID,
        serviceId: VALID_UUID,
        status: 'up',
        checkedAt: '2026-05-13', // missing time part
      }).success,
    ).toBe(false)
  })

  it('allows optional httpStatus, latencyMs, error fields', () => {
    const result = checkPropsSchema.safeParse({
      id: VALID_UUID,
      serviceId: VALID_UUID,
      status: 'down',
      httpStatus: 503,
      latencyMs: 1500,
      error: 'connection refused',
      checkedAt: '2026-05-13T10:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })
})

describe('createIncidentPropsSchema', () => {
  it('requires serviceId + title + severity + status + startedAt', () => {
    expect(createIncidentPropsSchema.safeParse({}).success).toBe(false)
  })

  it('accepts a minimal valid incident', () => {
    const result = createIncidentPropsSchema.safeParse({
      serviceId: VALID_UUID,
      title: 'API down',
      severity: 'major',
      status: 'investigating',
      startedAt: '2026-05-13T10:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects severity outside {minor, major, critical}', () => {
    expect(
      createIncidentPropsSchema.safeParse({
        serviceId: VALID_UUID,
        title: 'X',
        severity: 'catastrophic',
        status: 'investigating',
        startedAt: '2026-05-13T10:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('rejects status outside {investigating, identified, monitoring, resolved}', () => {
    expect(
      createIncidentPropsSchema.safeParse({
        serviceId: VALID_UUID,
        title: 'X',
        severity: 'minor',
        status: 'in-progress',
        startedAt: '2026-05-13T10:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('autoDetected defaults to false when omitted', () => {
    const result = createIncidentPropsSchema.parse({
      serviceId: VALID_UUID,
      title: 'X',
      severity: 'minor',
      status: 'investigating',
      startedAt: '2026-05-13T10:00:00.000Z',
    })
    expect(result.autoDetected).toBe(false)
  })
})

describe('updateIncidentPropsSchema', () => {
  it('omits non-updatable fields (serviceId, startedAt, autoDetected)', () => {
    // Update schema only includes title/description/severity/status/resolvedAt.
    // Extra keys are stripped silently in zod default mode, but the SHAPE
    // doesn't allow updating serviceId — assert that field is not in the
    // parsed output even when supplied.
    const result = updateIncidentPropsSchema.parse({
      title: 'New title',
      serviceId: VALID_UUID, // not in update schema
    } as unknown as Record<string, unknown>)
    expect('serviceId' in result).toBe(false)
  })

  it('accepts an empty update body', () => {
    expect(updateIncidentPropsSchema.safeParse({}).success).toBe(true)
  })

  it('accepts resolvedAt when transitioning to resolved', () => {
    expect(
      updateIncidentPropsSchema.safeParse({
        status: 'resolved',
        resolvedAt: '2026-05-13T11:00:00.000Z',
      }).success,
    ).toBe(true)
  })
})

describe('incidentPropsSchema (full record)', () => {
  it('rejects non-UUID serviceId', () => {
    expect(
      incidentPropsSchema.safeParse({
        id: VALID_UUID,
        serviceId: 'not-a-uuid',
        title: 'X',
        severity: 'minor',
        status: 'investigating',
        autoDetected: false,
        startedAt: '2026-05-13T10:00:00.000Z',
        createdAt: '2026-05-13T10:00:00.000Z',
        updatedAt: '2026-05-13T10:00:00.000Z',
      }).success,
    ).toBe(false)
  })
})

describe('uptimeWindowPropsSchema', () => {
  it('accepts a valid uptime window', () => {
    const result = uptimeWindowPropsSchema.safeParse({
      id: VALID_UUID,
      serviceId: VALID_UUID,
      window: '24h',
      uptimePct: 99.95,
      totalChecks: 1440,
      upChecks: 1438,
      avgLatencyMs: 152.5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects window outside the enum {1h, 24h, 7d, 30d, 90d}', () => {
    expect(
      uptimeWindowPropsSchema.safeParse({
        id: VALID_UUID,
        serviceId: VALID_UUID,
        window: '1w',
        uptimePct: 100,
        totalChecks: 1,
        upChecks: 1,
        avgLatencyMs: 0,
      }).success,
    ).toBe(false)
  })

  it('rejects non-integer totalChecks / upChecks', () => {
    expect(
      uptimeWindowPropsSchema.safeParse({
        id: VALID_UUID,
        serviceId: VALID_UUID,
        window: '24h',
        uptimePct: 100,
        totalChecks: 1440.5,
        upChecks: 1440,
        avgLatencyMs: 0,
      }).success,
    ).toBe(false)
  })

  it('accepts fractional uptimePct + avgLatencyMs', () => {
    expect(
      uptimeWindowPropsSchema.safeParse({
        id: VALID_UUID,
        serviceId: VALID_UUID,
        window: '7d',
        uptimePct: 99.9875,
        totalChecks: 10080,
        upChecks: 10079,
        avgLatencyMs: 87.42,
      }).success,
    ).toBe(true)
  })
})
