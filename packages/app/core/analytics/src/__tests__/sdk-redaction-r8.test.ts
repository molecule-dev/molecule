import { describe, expect, it, vi } from 'vitest'

import { snapshotAnalyticsSdkUrls } from '../sdk.js'

describe('round-eight data-only SDK capture', () => {
  it('redacts credential-named fields while retaining only SDK identifier locations', () => {
    const input = {
      event: 'click',
      token: 'root-project-id',
      $token: 'people-project-id',
      properties: {
        token: 'project-public-id',
        distinct_id: 'user-1',
        $device_id: 'device-1',
        $session_id: 'session-1',
        password: 'password-secret',
        headers: { Authorization: 'Bearer header-secret', Cookie: 'cookie-secret' },
        custom: { secret: 'private-secret', token: 'nested-token-secret' },
      },
      $group_key: 'company',
      $group_id: 'company-1',
    }

    const output = snapshotAnalyticsSdkUrls(input)

    expect(output.properties.token).toBe('project-public-id')
    expect(output.token).toBe('root-project-id')
    expect(output.$token).toBe('people-project-id')
    expect(output.properties.distinct_id).toBe('user-1')
    expect(output.properties.$device_id).toBe('device-1')
    expect(output.properties.$session_id).toBe('session-1')
    expect(output.$group_key).toBe('company')
    expect(output.properties.password).toBe('[REDACTED]')
    expect(output.properties.headers.Authorization).toBe('[REDACTED]')
    expect(output.properties.headers.Cookie).toBe('[REDACTED]')
    expect(output.properties.custom).toEqual({
      secret: '[REDACTED]',
      token: '[REDACTED]',
    })
  })

  it('materializes serialization hooks once and drops every other executable value', () => {
    const toJSON = vi.fn(() => ({ password: 'json-secret', safe: 'byte-for-byte' }))
    const input = {
      event: 'click',
      properties: {
        lateValue: { toJSON },
        functionValue: () => ({ password: 'function-secret' }),
        classValue: new (class {
          password = 'class-secret'
        })(),
      },
    }

    const output = snapshotAnalyticsSdkUrls(input)
    const serialized = JSON.stringify(output)

    expect(toJSON).toHaveBeenCalledTimes(1)
    expect(output.properties.lateValue).toEqual({
      password: '[REDACTED]',
      safe: 'byte-for-byte',
    })
    expect(output.properties).not.toHaveProperty('functionValue')
    expect(output.properties.classValue).toEqual({ password: '[REDACTED]' })
    expect(serialized).not.toContain('json-secret')
    expect(serialized).not.toContain('function-secret')
    expect(serialized).not.toContain('class-secret')
  })

  it('materializes a later inherited serializer once', () => {
    const inherited = vi.fn(() => '/callback?token=inherited-secret&view=full')
    Object.defineProperty(Object.prototype, 'toJSON', {
      value: inherited,
      configurable: true,
      writable: true,
    })
    try {
      expect(snapshotAnalyticsSdkUrls({ event: 'click' })).toBe(
        '/callback?token=[REDACTED]&view=full',
      )
      expect(inherited).toHaveBeenCalledTimes(1)
    } finally {
      delete Object.prototype.toJSON
    }
  })

  it('reads safe accessors once and never invokes credential-named accessors', () => {
    const safe = vi.fn(() => 'byte-for-byte')
    const password = vi.fn(() => 'accessor-secret')
    const properties: Record<string, unknown> = {}
    Object.defineProperty(properties, 'safe', { enumerable: true, get: safe })
    Object.defineProperty(properties, 'password', { enumerable: true, get: password })

    const output = snapshotAnalyticsSdkUrls({ event: 'click', properties })

    expect(safe).toHaveBeenCalledTimes(1)
    expect(password).not.toHaveBeenCalled()
    expect(output.properties).toEqual({ safe: 'byte-for-byte', password: '[REDACTED]' })
  })

  it('retains authority context without changing ordinary email identifiers', () => {
    const output = snapshotAnalyticsSdkUrls({
      event: 'click',
      properties: {
        $referrer: 'https://S@ref.example.test/start?safe=1',
        $referring_domain: 'S@ref.example.test',
        $initial_referring_domain: 'S@ref.example.test',
        $email: 'S@ref.example.test',
        ordinary: 'person@example.test',
      },
    })

    expect(output.properties.$referrer).toBe('https://[REDACTED]@ref.example.test/start?safe=1')
    expect(output.properties.$referring_domain).toBe('[REDACTED]@ref.example.test')
    expect(output.properties.$initial_referring_domain).toBe('[REDACTED]@ref.example.test')
    expect(output.properties.$email).toBe('S@ref.example.test')
    expect(output.properties.ordinary).toBe('person@example.test')
  })
})
