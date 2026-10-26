import { describe, expect, it } from 'vitest'

import {
  deriveProbeStatus,
  type NormalizedUptimeProbeSpec,
  UPTIME_LIMITS,
  validateProbeSpec,
} from '../validate.js'

const SPEC: NormalizedUptimeProbeSpec = {
  url: 'https://example.com/health',
  method: 'GET',
  timeoutMs: 10_000,
  expectStatus: undefined,
  expectText: undefined,
  degradedLatencyMs: 2000,
}

describe('validateProbeSpec', () => {
  it('applies every default', () => {
    const r = validateProbeSpec({ url: 'https://example.com' })
    expect(r).toEqual({
      ok: true,
      spec: {
        url: 'https://example.com',
        method: 'GET',
        timeoutMs: 10_000,
        expectStatus: undefined,
        expectText: undefined,
        degradedLatencyMs: 2000,
      },
    })
  })

  it('accepts a fully-specified spec', () => {
    const r = validateProbeSpec({
      url: 'http://example.com/x',
      method: 'HEAD',
      timeoutMs: 5000,
      expectStatus: 418,
      degradedLatencyMs: 0,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.spec.method).toBe('HEAD')
      expect(r.spec.expectStatus).toBe(418)
      expect(r.spec.degradedLatencyMs).toBe(0)
    }
  })

  it('refuses bad input field by field', () => {
    const refusals: Array<[unknown, string]> = [
      [null, 'must be an object'],
      ['https://example.com', 'must be an object'],
      [[1], 'must be an object'],
      [{}, 'must be 1-'],
      [{ url: '' }, 'must be 1-'],
      [{ url: `${'x'.repeat(UPTIME_LIMITS.maxUrlChars + 1)}` }, 'must be 1-'],
      [{ url: 'notaurl' }, 'http(s)'],
      [{ url: 'ftp://example.com' }, 'http(s)'],
      [{ url: 'https://a.com', method: 'get' }, 'must be "GET" or "HEAD"'],
      [{ url: 'https://a.com', method: 'POST' }, 'must be "GET" or "HEAD"'],
      [{ url: 'https://a.com', timeoutMs: 999 }, 'timeoutMs'],
      [{ url: 'https://a.com', timeoutMs: 30_001 }, 'timeoutMs'],
      [{ url: 'https://a.com', timeoutMs: 1.5 }, 'timeoutMs'],
      [{ url: 'https://a.com', expectStatus: 99 }, 'expectStatus'],
      [{ url: 'https://a.com', expectStatus: 600 }, 'expectStatus'],
      [{ url: 'https://a.com', expectStatus: 200.5 }, 'expectStatus'],
      [{ url: 'https://a.com', expectText: '' }, 'expectText'],
      [{ url: 'https://a.com', expectText: 'x'.repeat(257) }, 'expectText'],
      [{ url: 'https://a.com', method: 'HEAD', expectText: 'ok' }, 'HEAD carries none'],
      [{ url: 'https://a.com', degradedLatencyMs: -1 }, 'degradedLatencyMs'],
      [{ url: 'https://a.com', degradedLatencyMs: 30_001 }, 'degradedLatencyMs'],
    ]
    for (const [raw, fragment] of refusals) {
      const r = validateProbeSpec(raw)
      expect(r.ok, JSON.stringify(raw)).toBe(false)
      if (!r.ok) expect(r.message).toContain(fragment)
    }
  })

  it('ignores unknown fields (the hosted path rebuilds its body upstream)', () => {
    const r = validateProbeSpec({
      url: 'https://example.com',
      userAgent: 'smuggled',
      follow: 99,
    })
    expect(r.ok).toBe(true)
  })
})

describe('deriveProbeStatus', () => {
  it('a connection failure is down', () => {
    expect(deriveProbeStatus({ failure: 'ECONNREFUSED' }, SPEC)).toEqual({
      status: 'down',
      message: 'ECONNREFUSED',
    })
  })

  it('2xx is operational, 4xx/5xx down, 3xx degraded', () => {
    expect(deriveProbeStatus({ httpStatus: 204 }, SPEC).status).toBe('operational')
    expect(deriveProbeStatus({ httpStatus: 299 }, SPEC).status).toBe('operational')
    expect(deriveProbeStatus({ httpStatus: 302 }, SPEC).status).toBe('degraded')
    expect(deriveProbeStatus({ httpStatus: 404 }, SPEC)).toEqual({
      status: 'down',
      message: 'HTTP 404.',
    })
    expect(deriveProbeStatus({ httpStatus: 500 }, SPEC).status).toBe('down')
  })

  it('expectStatus is the whole verdict', () => {
    expect(deriveProbeStatus({ httpStatus: 404 }, { ...SPEC, expectStatus: 404 }).status).toBe(
      'operational',
    )
    const r = deriveProbeStatus({ httpStatus: 200 }, { ...SPEC, expectStatus: 204 })
    expect(r.status).toBe('down')
    expect(r.message).toBe('"expectStatus" wanted 204, got 200.')
  })

  it('missing expectText is down even on a 200', () => {
    const r = deriveProbeStatus(
      { httpStatus: 200, expectTextMatched: false },
      {
        ...SPEC,
        expectText: '"ok"',
      },
    )
    expect(r.status).toBe('down')
    expect(r.message).toContain('not found')
  })

  it('matched expectText keeps the status the status rules chose', () => {
    expect(
      deriveProbeStatus(
        { httpStatus: 200, expectTextMatched: true },
        {
          ...SPEC,
          expectText: '"ok"',
        },
      ).status,
    ).toBe('operational')
  })

  it('a slow operational probe degrades; a slow down stays down', () => {
    const slow = deriveProbeStatus({ httpStatus: 200, latencyMs: 3000 }, SPEC)
    expect(slow.status).toBe('degraded')
    expect(slow.message).toContain('3000ms')
    expect(deriveProbeStatus({ httpStatus: 503, latencyMs: 3000 }, SPEC).status).toBe('down')
    expect(deriveProbeStatus({ httpStatus: 200, latencyMs: 2000 }, SPEC).status).toBe('operational')
  })
})
