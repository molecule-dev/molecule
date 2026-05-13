import { describe, expect, it, vi } from 'vitest'

import { validateValue } from '../validation.js'

describe('validateValue — required', () => {
  it('returns default message when value is empty + required=true', async () => {
    expect(await validateValue('', { required: true })).toBe('This field is required')
  })

  it('returns custom message when required is a string', async () => {
    expect(await validateValue('', { required: 'Name is required' })).toBe('Name is required')
  })

  it('treats null / undefined as empty', async () => {
    expect(await validateValue(null, { required: true })).toBe('This field is required')
    expect(await validateValue(undefined, { required: true })).toBe('This field is required')
  })

  it('treats empty array as empty', async () => {
    expect(await validateValue([], { required: true })).toBe('This field is required')
  })

  it('non-empty value passes required', async () => {
    expect(await validateValue('hello', { required: true })).toBeUndefined()
    expect(await validateValue(0, { required: true })).toBeUndefined() // 0 is not empty
    expect(await validateValue(['x'], { required: true })).toBeUndefined()
  })

  it('returns undefined when value is empty + not required (other checks skipped)', async () => {
    expect(await validateValue('', { minLength: 5 })).toBeUndefined()
    expect(await validateValue(null, { email: true })).toBeUndefined()
  })
})

describe('validateValue — min/max (numbers)', () => {
  it('min rejects below threshold', async () => {
    expect(await validateValue(3, { min: 5 })).toBe('Value must be at least 5')
  })

  it('min accepts at/above threshold', async () => {
    expect(await validateValue(5, { min: 5 })).toBeUndefined()
    expect(await validateValue(10, { min: 5 })).toBeUndefined()
  })

  it('min uses custom message when supplied as object', async () => {
    expect(await validateValue(1, { min: { value: 5, message: 'Must be ≥ 5' } })).toBe(
      'Must be ≥ 5',
    )
  })

  it('max rejects above threshold', async () => {
    expect(await validateValue(10, { max: 5 })).toBe('Value must be at most 5')
  })

  it('max accepts at/below threshold', async () => {
    expect(await validateValue(5, { max: 5 })).toBeUndefined()
    expect(await validateValue(0, { max: 5 })).toBeUndefined()
  })

  it('max uses custom message when object form', async () => {
    expect(await validateValue(10, { max: { value: 5, message: 'too big' } })).toBe('too big')
  })

  it('skips min/max when value is non-number', async () => {
    // strings/arrays don't trigger numeric min/max
    expect(await validateValue('xx', { min: 5 })).toBeUndefined()
  })
})

describe('validateValue — minLength/maxLength', () => {
  it('strings: minLength rejects below', async () => {
    expect(await validateValue('ab', { minLength: 5 })).toBe('Must be at least 5 characters')
  })

  it('strings: minLength accepts at/above', async () => {
    expect(await validateValue('abcde', { minLength: 5 })).toBeUndefined()
  })

  it('arrays: minLength counts items', async () => {
    expect(await validateValue([1, 2], { minLength: 3 })).toBe('Must be at least 3 characters')
    expect(await validateValue([1, 2, 3], { minLength: 3 })).toBeUndefined()
  })

  it('maxLength rejects above', async () => {
    expect(await validateValue('abcdef', { maxLength: 5 })).toBe('Must be at most 5 characters')
  })

  it('maxLength accepts at/below', async () => {
    expect(await validateValue('abcde', { maxLength: 5 })).toBeUndefined()
  })

  it('custom message for minLength + maxLength when object form', async () => {
    expect(await validateValue('x', { minLength: { value: 5, message: 'too short' } })).toBe(
      'too short',
    )
    expect(await validateValue('xxxxxxxx', { maxLength: { value: 5, message: 'too long' } })).toBe(
      'too long',
    )
  })
})

describe('validateValue — pattern', () => {
  it('regex pattern rejects non-matching', async () => {
    expect(await validateValue('abc', { pattern: /^\d+$/ })).toBe('Invalid format')
  })

  it('regex pattern accepts matching', async () => {
    expect(await validateValue('123', { pattern: /^\d+$/ })).toBeUndefined()
  })

  it('object form uses custom message', async () => {
    expect(
      await validateValue('abc', { pattern: { value: /^\d+$/, message: 'numbers only' } }),
    ).toBe('numbers only')
  })

  it('skips pattern check for non-string values', async () => {
    expect(await validateValue(123, { pattern: /^\d+$/ })).toBeUndefined() // number bypasses
  })
})

describe('validateValue — email', () => {
  it('rejects non-email strings with default message', async () => {
    expect(await validateValue('not-an-email', { email: true })).toBe('Invalid email address')
  })

  it('accepts valid email', async () => {
    expect(await validateValue('user@example.com', { email: true })).toBeUndefined()
  })

  it('rejects email missing @', async () => {
    expect(await validateValue('userexample.com', { email: true })).toBe('Invalid email address')
  })

  it('rejects email missing TLD', async () => {
    expect(await validateValue('user@example', { email: true })).toBe('Invalid email address')
  })

  it('uses custom message when email is a string', async () => {
    expect(await validateValue('bad', { email: 'Please provide a valid email' })).toBe(
      'Please provide a valid email',
    )
  })
})

describe('validateValue — url', () => {
  it('rejects non-URL with default message', async () => {
    expect(await validateValue('not a url', { url: true })).toBe('Invalid URL')
  })

  it('accepts valid http/https URL', async () => {
    expect(await validateValue('https://example.test', { url: true })).toBeUndefined()
    expect(await validateValue('http://x.test/path?a=1', { url: true })).toBeUndefined()
  })

  it('uses custom message when url is a string', async () => {
    expect(await validateValue('bad', { url: 'Bad URL' })).toBe('Bad URL')
  })
})

describe('validateValue — custom validate', () => {
  it('returns the string when custom validator returns a string', async () => {
    expect(
      await validateValue('x', {
        validate: () => 'custom error message',
      }),
    ).toBe('custom error message')
  })

  it('returns default invalidValue message when custom validator returns false', async () => {
    expect(
      await validateValue('x', {
        validate: () => false,
      }),
    ).toBe('Invalid value')
  })

  it('returns undefined when custom validator returns true', async () => {
    expect(
      await validateValue('x', {
        validate: () => true,
      }),
    ).toBeUndefined()
  })

  it('awaits async custom validators', async () => {
    expect(
      await validateValue('x', {
        validate: async () => 'async error',
      }),
    ).toBe('async error')
  })
})

describe('validateValue — i18n translation', () => {
  it('passes default message through t() with the right key + defaultValue', async () => {
    const t = vi.fn().mockReturnValue('translated')
    await validateValue('', { required: true }, t)
    expect(t).toHaveBeenCalledWith(
      'forms.required',
      undefined,
      expect.objectContaining({ defaultValue: 'This field is required' }),
    )
  })

  it('passes min value through t() variables', async () => {
    const t = vi.fn().mockReturnValue('t-result')
    await validateValue(1, { min: 5 }, t)
    expect(t).toHaveBeenCalledWith(
      'forms.min',
      expect.objectContaining({ min: 5 }),
      expect.objectContaining({ defaultValue: 'Value must be at least 5' }),
    )
  })

  it('object-form messages bypass t() entirely (caller-provided strings only)', async () => {
    const t = vi.fn().mockReturnValue('should-not-be-called')
    const out = await validateValue(1, { min: { value: 5, message: 'literal' } }, t)
    expect(out).toBe('literal')
    expect(t).not.toHaveBeenCalled()
  })
})

describe('validateValue — early termination', () => {
  it('returns first failure (required wins over minLength)', async () => {
    expect(await validateValue('', { required: true, minLength: 5 })).toBe('This field is required')
  })

  it('returns first failure (min wins over max)', async () => {
    expect(await validateValue(1, { min: 5, max: 3 })).toBe('Value must be at least 5')
  })
})
