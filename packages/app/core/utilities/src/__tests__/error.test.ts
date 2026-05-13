import { describe, expect, it, vi } from 'vitest'

import { defaultErrorMessages, getErrorMessage } from '../error.js'

describe('defaultErrorMessages', () => {
  it('has English fallback messages for every error code', () => {
    for (const code of [
      'NETWORK_ERROR',
      'TIMEOUT',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'VALIDATION_ERROR',
      'SERVER_ERROR',
      'UNKNOWN',
    ]) {
      expect(typeof defaultErrorMessages[code]).toBe('string')
      expect(defaultErrorMessages[code]!.length).toBeGreaterThan(0)
    }
  })
})

describe('getErrorMessage — string input', () => {
  it('maps known error code strings to translated messages', () => {
    expect(getErrorMessage('NETWORK_ERROR')).toBe(defaultErrorMessages.NETWORK_ERROR)
    expect(getErrorMessage('NOT_FOUND')).toBe(defaultErrorMessages.NOT_FOUND)
  })

  it('returns custom message when supplied for a known code', () => {
    const out = getErrorMessage('UNAUTHORIZED', { UNAUTHORIZED: 'Custom unauth message' })
    expect(out).toBe('Custom unauth message')
  })

  it('returns the raw string when not a known code', () => {
    expect(getErrorMessage('some weird error text')).toBe('some weird error text')
  })

  it('honours custom messages for arbitrary string keys', () => {
    expect(getErrorMessage('CUSTOM_CODE', { CUSTOM_CODE: 'my error' })).toBe('my error')
  })
})

describe('getErrorMessage — Error instances', () => {
  it('detects fetch-related TypeError as NETWORK_ERROR', () => {
    const err = new TypeError('Failed to fetch')
    expect(getErrorMessage(err)).toBe(defaultErrorMessages.NETWORK_ERROR)
  })

  it('detects AbortError as TIMEOUT', () => {
    const err = new Error('Aborted')
    err.name = 'AbortError'
    expect(getErrorMessage(err)).toBe(defaultErrorMessages.TIMEOUT)
  })

  it('returns Error.message for generic errors', () => {
    expect(getErrorMessage(new Error('something specific'))).toBe('something specific')
  })

  it('falls back to UNKNOWN when Error has empty message', () => {
    const err = new Error('')
    expect(getErrorMessage(err)).toBe(defaultErrorMessages.UNKNOWN)
  })

  it('does NOT detect TypeError without "fetch" mention as NETWORK_ERROR', () => {
    const err = new TypeError('wrong type')
    expect(getErrorMessage(err)).toBe('wrong type')
  })
})

describe('getErrorMessage — object with code/message/error', () => {
  it('uses .code lookup against messages when present', () => {
    expect(getErrorMessage({ code: 'FORBIDDEN' })).toBe(defaultErrorMessages.FORBIDDEN)
  })

  it('uses .message when .code is missing/unknown', () => {
    expect(getErrorMessage({ message: 'object message' })).toBe('object message')
  })

  it('uses .error when .code and .message are missing', () => {
    expect(getErrorMessage({ error: 'object.error string' })).toBe('object.error string')
  })

  it('prefers .code over .message when both present and known', () => {
    expect(getErrorMessage({ code: 'NOT_FOUND', message: 'fallback' })).toBe(
      defaultErrorMessages.NOT_FOUND,
    )
  })

  it('falls through to .message when .code is unknown', () => {
    expect(getErrorMessage({ code: 'UNKNOWN_CODE_X', message: 'fallback' })).toBe('fallback')
  })

  it('returns UNKNOWN for empty object', () => {
    expect(getErrorMessage({})).toBe(defaultErrorMessages.UNKNOWN)
  })
})

describe('getErrorMessage — null / undefined / unhandled', () => {
  it('returns UNKNOWN for null', () => {
    expect(getErrorMessage(null)).toBe(defaultErrorMessages.UNKNOWN)
  })

  it('returns UNKNOWN for undefined', () => {
    expect(getErrorMessage(undefined)).toBe(defaultErrorMessages.UNKNOWN)
  })

  it('returns UNKNOWN for numbers / booleans (unsupported types)', () => {
    expect(getErrorMessage(42)).toBe(defaultErrorMessages.UNKNOWN)
    expect(getErrorMessage(true)).toBe(defaultErrorMessages.UNKNOWN)
  })
})

describe('getErrorMessage — i18n translation function', () => {
  it('calls t(key, ...) for known error codes with the right key + defaultValue', () => {
    const t = vi.fn().mockReturnValue('translated msg')
    const out = getErrorMessage('NETWORK_ERROR', undefined, t)
    expect(out).toBe('translated msg')
    expect(t).toHaveBeenCalledWith(
      'error.networkError',
      undefined,
      expect.objectContaining({ defaultValue: defaultErrorMessages.NETWORK_ERROR }),
    )
  })

  it('translates code from Error-name path (TypeError fetch → networkError)', () => {
    const t = vi.fn().mockReturnValue('🌐 network')
    const err = new TypeError('Failed to fetch')
    expect(getErrorMessage(err, undefined, t)).toBe('🌐 network')
    expect(t.mock.calls[0][0]).toBe('error.networkError')
  })

  it('translates code from object.code path', () => {
    const t = vi.fn().mockReturnValue('not authd!')
    expect(getErrorMessage({ code: 'UNAUTHORIZED' }, undefined, t)).toBe('not authd!')
    expect(t.mock.calls[0][0]).toBe('error.unauthorized')
  })

  it('does NOT call t for raw arbitrary strings (no key mapping)', () => {
    const t = vi.fn()
    getErrorMessage('arbitrary text', undefined, t)
    expect(t).not.toHaveBeenCalled()
  })

  it('uses customMessages as the defaultValue when both custom and t are provided', () => {
    const t = vi
      .fn()
      .mockImplementation(
        (_k: string, _v: unknown, opts: { defaultValue?: string }) => opts.defaultValue ?? '',
      )
    const out = getErrorMessage('NETWORK_ERROR', { NETWORK_ERROR: 'custom default' }, t)
    expect(out).toBe('custom default')
  })
})
