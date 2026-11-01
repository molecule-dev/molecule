import { describe, expect, it, vi } from 'vitest'

import { snapshotAnalyticsSdkUrls } from '../sdk.js'

describe('round-nine SDK data capture', () => {
  it('captures credential strings whether or not they contain URL punctuation', () => {
    const output = snapshotAnalyticsSdkUrls({
      event: 'click',
      properties: {
        diagnostic: 'Authorization: Bearer header-credential',
        serialized: '{"password":"json-credential"}',
        form: 'password=form-credential',
        safe: 'byte-for-byte',
      },
    })

    expect(output.properties.diagnostic).toBe('Authorization: [REDACTED]')
    expect(output.properties.serialized).toBe('{"password":"[REDACTED]"}')
    expect(output.properties.form).toBe('password=[REDACTED]')
    expect(output.properties.safe).toBe('byte-for-byte')
  })

  it('limits session-entry exemptions to verified direct SDK metadata', () => {
    const getter = vi.fn(() => 'session-entry-field-credential')
    const properties: Record<string, unknown> = {
      $session_entry_url: '/reset?token=url-credential&view=full',
      nested: { $session_entry_url: '/reset?token=nested-credential&view=full' },
    }
    Object.defineProperty(properties, '$session_entry_secret', {
      get: getter,
      enumerable: true,
    })

    const output = snapshotAnalyticsSdkUrls({ event: 'click', properties })

    expect(getter).not.toHaveBeenCalled()
    expect(output.properties.$session_entry_secret).toBe('[REDACTED]')
    expect(output.properties.$session_entry_url).toBe('/reset?token=[REDACTED]&view=full')
    expect(output.properties.nested.$session_entry_url).toBe('[REDACTED]')
  })

  it('retains JSON-safe class fields, Dates, URLs and class serializer results', () => {
    class Dimensions {
      width = 640
      height = 480
    }
    class Money {
      toJSON() {
        return { amount: 10, currency: 'EUR' }
      }
    }
    const input = {
      event: 'paid',
      properties: {
        dimensions: new Dimensions(),
        when: new Date('2026-01-01'),
        receipt: new URL('https://safe.test/path?q=1'),
        total: new Money(),
      },
    }

    expect(JSON.stringify(snapshotAnalyticsSdkUrls(input))).toBe(JSON.stringify(input))
  })

  it('passes the transport property key to object and array serializers', () => {
    const toJSON = vi.fn(function (key: string) {
      return { safe: key === 'receipt' ? 'receipt data' : 'wrong key' }
    })
    const input = {
      event: 'paid',
      properties: {
        receipt: { toJSON },
        items: [
          {
            toJSON(key: string) {
              return { index: key }
            },
          },
        ],
      },
    }
    const expected = JSON.stringify(input)
    toJSON.mockClear()

    expect(JSON.stringify(snapshotAnalyticsSdkUrls(input))).toBe(expected)
    expect(toJSON).toHaveBeenCalledTimes(1)
    expect(toJSON).toHaveBeenCalledWith('receipt')
  })

  it('materializes inherited container serializers once and leaves none executable', () => {
    let calls = 0
    Object.defineProperty(Array.prototype, 'toJSON', {
      configurable: true,
      value: function () {
        calls++
        return { password: 'array-serializer-credential', safe: 'retained' }
      },
    })
    try {
      const result = snapshotAnalyticsSdkUrls({ event: 'click', properties: { items: [1, 2] } })
      expect(calls).toBe(1)
      const serialized = JSON.stringify(result)
      expect(calls).toBe(1)
      expect(serialized).toContain('retained')
      expect(serialized).not.toContain('array-serializer-credential')
    } finally {
      delete (Array.prototype as { toJSON?: unknown }).toJSON
    }
  })

  it('redacts an apostrophe credential suffix in SDK URL text', () => {
    const text = "/reset?token=first'credential-tail&view=full"
    expect(
      snapshotAnalyticsSdkUrls({ properties: { $current_url: text } }).properties.$current_url,
    ).toBe('/reset?token=[REDACTED]&view=full')
  })
})
