import { describe, expect, it } from 'vitest'

import {
  alphanumeric,
  isAlphanumeric,
  toCamelCase,
  toKebabCase,
  toTitleCase,
  truncate,
} from '../string.js'

describe('isAlphanumeric', () => {
  it('returns false for empty / falsy', () => {
    expect(isAlphanumeric('')).toBe(false)
  })

  it('accepts pure alphanumeric', () => {
    expect(isAlphanumeric('abcXYZ123')).toBe(true)
  })

  it('rejects strings with spaces by default', () => {
    expect(isAlphanumeric('hello world')).toBe(false)
  })

  it('allows spaces when allowSpaces=true', () => {
    expect(isAlphanumeric('hello world', { allowSpaces: true })).toBe(true)
  })

  it('rejects strings with dashes by default', () => {
    expect(isAlphanumeric('foo-bar')).toBe(false)
  })

  it('allows dashes when allowDashes=true', () => {
    expect(isAlphanumeric('foo-bar', { allowDashes: true })).toBe(true)
  })

  it('allows underscores when allowUnderscores=true', () => {
    expect(isAlphanumeric('foo_bar', { allowUnderscores: true })).toBe(true)
  })

  it('rejects special characters even with all flags on', () => {
    expect(
      isAlphanumeric('hello!', {
        allowSpaces: true,
        allowDashes: true,
        allowUnderscores: true,
      }),
    ).toBe(false)
  })

  it('enforces minLength', () => {
    expect(isAlphanumeric('ab', { minLength: 3 })).toBe(false)
    expect(isAlphanumeric('abc', { minLength: 3 })).toBe(true)
  })

  it('enforces maxLength', () => {
    expect(isAlphanumeric('abcdef', { maxLength: 5 })).toBe(false)
    expect(isAlphanumeric('abcde', { maxLength: 5 })).toBe(true)
  })

  it('enforces both minLength and maxLength', () => {
    expect(isAlphanumeric('ab', { minLength: 3, maxLength: 5 })).toBe(false)
    expect(isAlphanumeric('abc', { minLength: 3, maxLength: 5 })).toBe(true)
    expect(isAlphanumeric('abcde', { minLength: 3, maxLength: 5 })).toBe(true)
    expect(isAlphanumeric('abcdef', { minLength: 3, maxLength: 5 })).toBe(false)
  })
})

describe('alphanumeric', () => {
  it('returns empty string for falsy input', () => {
    expect(alphanumeric('')).toBe('')
  })

  it('strips spaces by default', () => {
    expect(alphanumeric('hello world')).toBe('helloworld')
  })

  it('preserves spaces when allowSpaces=true', () => {
    expect(alphanumeric('hello world!', { allowSpaces: true })).toBe('hello world')
  })

  it('strips punctuation while preserving letters and digits', () => {
    expect(alphanumeric('abc-123!@#')).toBe('abc123')
  })

  it('preserves dashes when allowDashes=true', () => {
    expect(alphanumeric('abc-123!@#', { allowDashes: true })).toBe('abc-123')
  })

  it('preserves underscores when allowUnderscores=true', () => {
    expect(alphanumeric('abc_123!@#', { allowUnderscores: true })).toBe('abc_123')
  })

  it('passes through pure alphanumeric input unchanged', () => {
    expect(alphanumeric('abcXYZ123')).toBe('abcXYZ123')
  })
})

describe('truncate', () => {
  it('returns input unchanged when below or equal to maxLength', () => {
    expect(truncate('hello', 100)).toBe('hello')
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('appends default "..." suffix when truncated', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('uses custom suffix when provided', () => {
    expect(truncate('hello world', 8, '…')).toBe('hello w…')
  })

  it('returns empty for empty / falsy input', () => {
    expect(truncate('', 5)).toBe('')
  })

  it('honours the total length including suffix', () => {
    const out = truncate('a'.repeat(50), 10)
    expect(out.length).toBe(10)
  })
})

describe('toTitleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World')
  })

  it('lowercases all other letters', () => {
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World')
  })

  it('handles single word', () => {
    expect(toTitleCase('hello')).toBe('Hello')
  })

  it('returns empty for empty / falsy', () => {
    expect(toTitleCase('')).toBe('')
  })

  it('preserves multiple whitespace runs (capitalizes after each)', () => {
    expect(toTitleCase('hello  world')).toBe('Hello  World')
  })
})

describe('toKebabCase', () => {
  it('converts camelCase to kebab', () => {
    expect(toKebabCase('myVariable')).toBe('my-variable')
  })

  it('converts PascalCase to kebab', () => {
    expect(toKebabCase('MyVariable')).toBe('my-variable')
  })

  it('converts snake_case to kebab', () => {
    expect(toKebabCase('my_variable')).toBe('my-variable')
  })

  it('converts space-separated to kebab', () => {
    expect(toKebabCase('my variable')).toBe('my-variable')
  })

  it('handles multiple separators', () => {
    expect(toKebabCase('my  variable__here')).toBe('my-variable-here')
  })

  it('returns empty for falsy', () => {
    expect(toKebabCase('')).toBe('')
  })

  it('preserves already-kebab input', () => {
    expect(toKebabCase('already-kebab')).toBe('already-kebab')
  })
})

describe('toCamelCase', () => {
  it('converts kebab-case to camel', () => {
    expect(toCamelCase('my-variable')).toBe('myVariable')
  })

  it('converts snake_case to camel', () => {
    expect(toCamelCase('my_variable')).toBe('myVariable')
  })

  it('converts space-separated to camel', () => {
    expect(toCamelCase('my variable')).toBe('myVariable')
  })

  it('lowercases the first character if it was upper', () => {
    expect(toCamelCase('MyVariable')).toBe('myVariable')
  })

  it('handles multiple separators', () => {
    expect(toCamelCase('a-b-c')).toBe('aBC')
  })

  it('returns empty for falsy', () => {
    expect(toCamelCase('')).toBe('')
  })
})
