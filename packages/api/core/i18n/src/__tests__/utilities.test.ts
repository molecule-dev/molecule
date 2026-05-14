import { describe, expect, it } from 'vitest'

import type { Translations } from '../types.js'
import { getNestedValue, interpolate } from '../utilities.js'

describe('getNestedValue', () => {
  it('returns undefined for an empty translations object', () => {
    expect(getNestedValue({}, 'any.key')).toBeUndefined()
  })

  it('returns undefined when the key is missing', () => {
    expect(getNestedValue({ hello: 'Hello' }, 'goodbye')).toBeUndefined()
  })

  it('resolves a top-level string key', () => {
    expect(getNestedValue({ hello: 'Hello' }, 'hello')).toBe('Hello')
  })

  it('resolves a flat dotted key when stored verbatim', () => {
    const obj: Translations = { 'auth.login.email': 'Email' }
    expect(getNestedValue(obj, 'auth.login.email')).toBe('Email')
  })

  it('resolves a nested key by dot-traversal', () => {
    const obj: Translations = { auth: { login: { email: 'Email' } } }
    expect(getNestedValue(obj, 'auth.login.email')).toBe('Email')
  })

  it('prefers a flat key over a nested traversal of the same path', () => {
    const obj: Translations = {
      'auth.login.email': 'flat',
      auth: { login: { email: 'nested' } },
    }
    expect(getNestedValue(obj, 'auth.login.email')).toBe('flat')
  })

  it('returns undefined when traversal hits a non-object before consuming all parts', () => {
    const obj: Translations = { auth: 'not-an-object' }
    expect(getNestedValue(obj, 'auth.login')).toBeUndefined()
  })

  it('returns undefined when traversal hits a missing key', () => {
    const obj: Translations = { auth: { login: { email: 'Email' } } }
    expect(getNestedValue(obj, 'auth.signup.email')).toBeUndefined()
  })

  it('returns undefined when the resolved value is itself an object (not a leaf string)', () => {
    const obj: Translations = { auth: { login: { email: 'Email' } } }
    expect(getNestedValue(obj, 'auth.login')).toBeUndefined()
  })
})

describe('interpolate', () => {
  it('returns the string unchanged when there are no placeholders', () => {
    expect(interpolate('Hello world', {})).toBe('Hello world')
  })

  it('substitutes a single placeholder', () => {
    expect(interpolate('Hello {{name}}', { name: 'Alice' })).toBe('Hello Alice')
  })

  it('substitutes multiple placeholders', () => {
    expect(interpolate('Hi {{first}} {{last}}', { first: 'Ada', last: 'Lovelace' })).toBe(
      'Hi Ada Lovelace',
    )
  })

  it('coerces non-string values to strings via String()', () => {
    expect(interpolate('Score: {{count}}', { count: 42 })).toBe('Score: 42')
    expect(interpolate('Active: {{flag}}', { flag: true })).toBe('Active: true')
  })

  it('formats Date values via toLocaleDateString', () => {
    const d = new Date('2026-05-14T10:00:00Z')
    const out = interpolate('On {{when}}', { when: d })
    expect(out.startsWith('On ')).toBe(true)
    expect(out.length).toBeGreaterThan('On '.length)
    // Sanity check: doesn't contain the raw ISO string
    expect(out).not.toContain('T10:00:00')
  })

  it('leaves the placeholder intact when value is undefined', () => {
    expect(interpolate('Hello {{name}}', {})).toBe('Hello {{name}}')
  })

  it('does not match placeholders with non-word characters', () => {
    expect(interpolate('Hello {{na me}}', { 'na me': 'X' })).toBe('Hello {{na me}}')
  })

  it('replaces all occurrences of the same key', () => {
    expect(interpolate('{{x}} and {{x}}', { x: 'Y' })).toBe('Y and Y')
  })
})
