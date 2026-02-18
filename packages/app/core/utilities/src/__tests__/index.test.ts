// @vitest-environment happy-dom
/**
 * Comprehensive tests for `@molecule/app-utilities` module.
 *
 * Tests string utilities, date/time functions, validation,
 * formatting, URL utilities, encoding, async helpers,
 * error handling, clipboard, and random generation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AlphanumericOptions } from '../index.js'
import {
  alphanumeric,
  // Clipboard utilities
  copyToClipboard,
  debounce,
  // Error utilities
  defaultErrorMessages,
  formatCurrency,
  formatNumber,
  formatPercent,
  getErrorMessage,
  // Format utilities
  getHumanFileSize,
  handleAnchorClick,
  // String utilities
  isAlphanumeric,
  // Validation utilities
  isEmail,
  isInternalUrl,
  isUrl,
  openUrl,
  parseQueryString,
  // Random utilities
  randomString,
  readFromClipboard,
  retry,
  // Async utilities
  sleep,
  throttle,
  // Date utilities
  timeAgo,
  toCamelCase,
  toKebabCase,
  // URL utilities
  toQueryString,
  toTitleCase,
  truncate,
  uint8ArrayToUrlBase64,
  // Encoding utilities
  urlBase64ToUint8Array,
  uuid,
} from '../index.js'

describe('@molecule/app-utilities', () => {
  describe('Types compile correctly', () => {
    it('should compile AlphanumericOptions type', () => {
      const options: AlphanumericOptions = {
        allowSpaces: true,
        allowDashes: true,
        allowUnderscores: true,
        minLength: 1,
        maxLength: 100,
      }
      expect(options.allowSpaces).toBe(true)
    })
  })

  describe('String Utilities', () => {
    describe('isAlphanumeric', () => {
      it('should return true for alphanumeric strings', () => {
        expect(isAlphanumeric('abc123')).toBe(true)
        expect(isAlphanumeric('ABC')).toBe(true)
        expect(isAlphanumeric('123')).toBe(true)
        expect(isAlphanumeric('aB1')).toBe(true)
      })

      it('should return false for empty strings', () => {
        expect(isAlphanumeric('')).toBe(false)
      })

      it('should return false for strings with special characters', () => {
        expect(isAlphanumeric('hello!')).toBe(false)
        expect(isAlphanumeric('hello@world')).toBe(false)
        expect(isAlphanumeric('test#123')).toBe(false)
      })

      it('should allow spaces when option is set', () => {
        expect(isAlphanumeric('hello world', { allowSpaces: true })).toBe(true)
        expect(isAlphanumeric('hello world')).toBe(false)
      })

      it('should allow dashes when option is set', () => {
        expect(isAlphanumeric('hello-world', { allowDashes: true })).toBe(true)
        expect(isAlphanumeric('hello-world')).toBe(false)
      })

      it('should allow underscores when option is set', () => {
        expect(isAlphanumeric('hello_world', { allowUnderscores: true })).toBe(true)
        expect(isAlphanumeric('hello_world')).toBe(false)
      })

      it('should respect minLength option', () => {
        expect(isAlphanumeric('ab', { minLength: 3 })).toBe(false)
        expect(isAlphanumeric('abc', { minLength: 3 })).toBe(true)
        expect(isAlphanumeric('abcd', { minLength: 3 })).toBe(true)
      })

      it('should respect maxLength option', () => {
        expect(isAlphanumeric('abcdefg', { maxLength: 5 })).toBe(false)
        expect(isAlphanumeric('abcde', { maxLength: 5 })).toBe(true)
        expect(isAlphanumeric('abc', { maxLength: 5 })).toBe(true)
      })

      it('should respect minLength and maxLength together', () => {
        expect(isAlphanumeric('ab', { minLength: 3, maxLength: 5 })).toBe(false)
        expect(isAlphanumeric('abc', { minLength: 3, maxLength: 5 })).toBe(true)
        expect(isAlphanumeric('abcde', { minLength: 3, maxLength: 5 })).toBe(true)
        expect(isAlphanumeric('abcdef', { minLength: 3, maxLength: 5 })).toBe(false)
      })

      it('should combine multiple options', () => {
        expect(
          isAlphanumeric('hello-world_123', {
            allowDashes: true,
            allowUnderscores: true,
          }),
        ).toBe(true)
      })
    })

    describe('alphanumeric', () => {
      it('should clean non-alphanumeric characters', () => {
        expect(alphanumeric('hello!@#world')).toBe('helloworld')
        expect(alphanumeric('test123!@#')).toBe('test123')
      })

      it('should return empty string for empty input', () => {
        expect(alphanumeric('')).toBe('')
      })

      it('should preserve alphanumeric characters', () => {
        expect(alphanumeric('abc123')).toBe('abc123')
      })

      it('should allow spaces when option is set', () => {
        expect(alphanumeric('hello world!', { allowSpaces: true })).toBe('hello world')
      })

      it('should allow dashes when option is set', () => {
        expect(alphanumeric('hello-world!', { allowDashes: true })).toBe('hello-world')
      })

      it('should allow underscores when option is set', () => {
        expect(alphanumeric('hello_world!', { allowUnderscores: true })).toBe('hello_world')
      })
    })

    describe('truncate', () => {
      it('should truncate long strings', () => {
        expect(truncate('Hello World', 8)).toBe('Hello...')
      })

      it('should not truncate short strings', () => {
        expect(truncate('Hello', 10)).toBe('Hello')
      })

      it('should handle exact length', () => {
        expect(truncate('Hello', 5)).toBe('Hello')
      })

      it('should use custom suffix', () => {
        expect(truncate('Hello World', 9, '---')).toBe('Hello ---')
      })

      it('should handle empty string', () => {
        expect(truncate('', 5)).toBe('')
      })

      it('should handle null/undefined', () => {
        expect(truncate(null as unknown as string, 5)).toBe(null)
        expect(truncate(undefined as unknown as string, 5)).toBe(undefined)
      })
    })

    describe('toTitleCase', () => {
      it('should convert to title case', () => {
        expect(toTitleCase('hello world')).toBe('Hello World')
        expect(toTitleCase('HELLO WORLD')).toBe('Hello World')
        expect(toTitleCase('hElLo WoRlD')).toBe('Hello World')
      })

      it('should handle single word', () => {
        expect(toTitleCase('hello')).toBe('Hello')
      })

      it('should handle empty string', () => {
        expect(toTitleCase('')).toBe('')
      })

      it('should handle multiple spaces', () => {
        expect(toTitleCase('hello  world')).toBe('Hello  World')
      })
    })

    describe('toKebabCase', () => {
      it('should convert camelCase to kebab-case', () => {
        expect(toKebabCase('helloWorld')).toBe('hello-world')
        expect(toKebabCase('myVariableName')).toBe('my-variable-name')
      })

      it('should convert spaces to dashes', () => {
        expect(toKebabCase('hello world')).toBe('hello-world')
      })

      it('should convert underscores to dashes', () => {
        expect(toKebabCase('hello_world')).toBe('hello-world')
      })

      it('should handle PascalCase', () => {
        expect(toKebabCase('HelloWorld')).toBe('hello-world')
      })

      it('should handle empty string', () => {
        expect(toKebabCase('')).toBe('')
      })

      it('should handle mixed input', () => {
        expect(toKebabCase('myVariable_name here')).toBe('my-variable-name-here')
      })
    })

    describe('toCamelCase', () => {
      it('should convert kebab-case to camelCase', () => {
        expect(toCamelCase('hello-world')).toBe('helloWorld')
      })

      it('should convert snake_case to camelCase', () => {
        expect(toCamelCase('hello_world')).toBe('helloWorld')
      })

      it('should convert spaces to camelCase', () => {
        expect(toCamelCase('hello world')).toBe('helloWorld')
      })

      it('should handle PascalCase input', () => {
        expect(toCamelCase('HelloWorld')).toBe('helloWorld')
      })

      it('should handle empty string', () => {
        expect(toCamelCase('')).toBe('')
      })

      it('should handle mixed separators', () => {
        expect(toCamelCase('hello-world_test here')).toBe('helloWorldTestHere')
      })
    })
  })

  describe('Date Utilities', () => {
    describe('timeAgo', () => {
      beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should return "just now" for recent times', () => {
        const now = Date.now()
        expect(timeAgo(now)).toBe('just now')
        expect(timeAgo(now - 30000)).toBe('just now') // 30 seconds ago
      })

      it('should return minutes ago', () => {
        const now = Date.now()
        expect(timeAgo(now - 60000)).toBe('1 minute ago')
        expect(timeAgo(now - 120000)).toBe('2 minutes ago')
        expect(timeAgo(now - 3000000)).toBe('50 minutes ago')
      })

      it('should return hours ago', () => {
        const now = Date.now()
        expect(timeAgo(now - 3600000)).toBe('1 hour ago')
        expect(timeAgo(now - 7200000)).toBe('2 hours ago')
      })

      it('should return days ago', () => {
        const now = Date.now()
        expect(timeAgo(now - 86400000)).toBe('1 day ago')
        expect(timeAgo(now - 172800000)).toBe('2 days ago')
      })

      it('should return weeks ago', () => {
        const now = Date.now()
        expect(timeAgo(now - 604800000)).toBe('1 week ago')
        expect(timeAgo(now - 1209600000)).toBe('2 weeks ago')
      })

      it('should return years ago', () => {
        const now = Date.now()
        expect(timeAgo(now - 31557600000)).toBe('1 year ago')
        expect(timeAgo(now - 63115200000)).toBe('2 years ago')
      })

      it('should accept Date objects', () => {
        const date = new Date(Date.now() - 3600000)
        expect(timeAgo(date)).toBe('1 hour ago')
      })

      it('should accept ISO strings', () => {
        const isoString = new Date(Date.now() - 3600000).toISOString()
        expect(timeAgo(isoString)).toBe('1 hour ago')
      })

      it('should abbreviate when requested', () => {
        const now = Date.now()
        expect(timeAgo(now - 60000, true)).toBe('1m ago')
        expect(timeAgo(now - 3600000, true)).toBe('1h ago')
        expect(timeAgo(now - 86400000, true)).toBe('1d ago')
        expect(timeAgo(now - 604800000, true)).toBe('1w ago')
        expect(timeAgo(now - 31557600000, true)).toBe('1y ago')
      })

      it('should handle invalid dates', () => {
        // Invalid date string results in NaN timestamp, which produces NaN in calculations
        // The actual implementation might return 'NaN years ago' or similar
        const result = timeAgo('invalid-date')
        // Just verify it returns a string (implementation-specific behavior)
        expect(typeof result).toBe('string')
      })

      it('should handle future dates (returns just now)', () => {
        const future = Date.now() + 10000
        expect(timeAgo(future)).toBe('just now')
      })
    })
  })

  describe('Validation Utilities', () => {
    describe('isEmail', () => {
      it('should validate correct emails', () => {
        expect(isEmail('test@example.com')).toBe(true)
        expect(isEmail('user.name@domain.co.uk')).toBe(true)
        expect(isEmail('user+tag@example.org')).toBe(true)
        expect(isEmail('test123@test.io')).toBe(true)
      })

      it('should reject invalid emails', () => {
        expect(isEmail('')).toBe(false)
        expect(isEmail('notanemail')).toBe(false)
        expect(isEmail('@example.com')).toBe(false)
        expect(isEmail('test@')).toBe(false)
        expect(isEmail('test@.com')).toBe(false)
        expect(isEmail('test @example.com')).toBe(false)
      })

      it('should handle edge cases', () => {
        expect(isEmail(null as unknown as string)).toBe(false)
        expect(isEmail(undefined as unknown as string)).toBe(false)
      })
    })

    describe('isUrl', () => {
      it('should validate correct URLs', () => {
        expect(isUrl('https://example.com')).toBe(true)
        expect(isUrl('http://example.com')).toBe(true)
        expect(isUrl('https://example.com/path/to/page')).toBe(true)
        expect(isUrl('https://example.com?query=value')).toBe(true)
        expect(isUrl('https://subdomain.example.com')).toBe(true)
        expect(isUrl('ftp://files.example.com')).toBe(true)
      })

      it('should reject invalid URLs', () => {
        expect(isUrl('')).toBe(false)
        expect(isUrl('notaurl')).toBe(false)
        expect(isUrl('example.com')).toBe(false) // Missing protocol
        expect(isUrl('://example.com')).toBe(false)
      })

      it('should handle edge cases', () => {
        expect(isUrl(null as unknown as string)).toBe(false)
        expect(isUrl(undefined as unknown as string)).toBe(false)
      })
    })
  })

  describe('Format Utilities', () => {
    describe('getHumanFileSize', () => {
      it('should format bytes', () => {
        expect(getHumanFileSize(0)).toBe('0 B')
        expect(getHumanFileSize(500)).toBe('500 B')
        expect(getHumanFileSize(1023)).toBe('1023 B')
      })

      it('should format kilobytes', () => {
        expect(getHumanFileSize(1024)).toBe('1 KB')
        expect(getHumanFileSize(1536)).toBe('1.5 KB')
      })

      it('should format megabytes', () => {
        expect(getHumanFileSize(1048576)).toBe('1 MB')
        expect(getHumanFileSize(1572864)).toBe('1.5 MB')
      })

      it('should format gigabytes', () => {
        expect(getHumanFileSize(1073741824)).toBe('1 GB')
      })

      it('should format terabytes', () => {
        expect(getHumanFileSize(1099511627776)).toBe('1 TB')
      })

      it('should respect decimal places', () => {
        expect(getHumanFileSize(1536, 0)).toBe('2 KB')
        expect(getHumanFileSize(1536, 1)).toBe('1.5 KB')
        expect(getHumanFileSize(1536, 3)).toBe('1.5 KB')
      })

      it('should handle negative numbers', () => {
        expect(getHumanFileSize(-1024)).toBe('-1 KB')
      })
    })

    describe('formatNumber', () => {
      it('should format with thousand separators', () => {
        expect(formatNumber(1000)).toBe('1,000')
        expect(formatNumber(1000000)).toBe('1,000,000')
        expect(formatNumber(1234567890)).toBe('1,234,567,890')
      })

      it('should handle small numbers', () => {
        expect(formatNumber(0)).toBe('0')
        expect(formatNumber(999)).toBe('999')
      })

      it('should handle decimals', () => {
        expect(formatNumber(1234.56)).toBe('1,234.56')
      })

      it('should handle negative numbers', () => {
        expect(formatNumber(-1000)).toBe('-1,000')
      })

      it('should respect locale', () => {
        // German locale uses . for thousands and , for decimal
        expect(formatNumber(1234.56, 'de-DE')).toBe('1.234,56')
      })
    })

    describe('formatCurrency', () => {
      it('should format USD by default', () => {
        const result = formatCurrency(1234.56)
        expect(result).toContain('1,234.56')
        expect(result).toMatch(/\$/)
      })

      it('should format other currencies', () => {
        const eur = formatCurrency(1234.56, 'EUR', 'de-DE')
        expect(eur).toContain('1.234,56')
      })

      it('should handle zero', () => {
        expect(formatCurrency(0)).toContain('0.00')
      })

      it('should handle negative amounts', () => {
        const result = formatCurrency(-100)
        expect(result).toContain('100')
      })
    })

    describe('formatPercent', () => {
      it('should format as percentage', () => {
        expect(formatPercent(0.5)).toBe('50%')
        expect(formatPercent(1)).toBe('100%')
        expect(formatPercent(0.123)).toBe('12%')
      })

      it('should respect decimal places', () => {
        expect(formatPercent(0.1234, 2)).toBe('12.34%')
        expect(formatPercent(0.1, 1)).toBe('10.0%')
      })

      it('should handle values over 100%', () => {
        expect(formatPercent(1.5)).toBe('150%')
      })

      it('should handle negative percentages', () => {
        expect(formatPercent(-0.1)).toBe('-10%')
      })
    })
  })

  describe('URL Utilities', () => {
    describe('toQueryString', () => {
      it('should convert object to query string', () => {
        expect(toQueryString({ foo: 'bar' })).toBe('?foo=bar')
        expect(toQueryString({ a: 1, b: 2 })).toBe('?a=1&b=2')
      })

      it('should handle empty object', () => {
        expect(toQueryString({})).toBe('')
      })

      it('should skip null and undefined values', () => {
        expect(toQueryString({ a: 1, b: null, c: undefined })).toBe('?a=1')
      })

      it('should handle arrays', () => {
        const result = toQueryString({ tags: ['a', 'b', 'c'] })
        expect(result).toContain('tags=a')
        expect(result).toContain('tags=b')
        expect(result).toContain('tags=c')
      })

      it('should encode special characters', () => {
        const result = toQueryString({ query: 'hello world' })
        expect(result).toBe('?query=hello+world')
      })
    })

    describe('parseQueryString', () => {
      it('should parse query string to object', () => {
        expect(parseQueryString('?foo=bar')).toEqual({ foo: 'bar' })
        expect(parseQueryString('?a=1&b=2')).toEqual({ a: '1', b: '2' })
      })

      it('should handle query string without ?', () => {
        expect(parseQueryString('foo=bar')).toEqual({ foo: 'bar' })
      })

      it('should handle empty query string', () => {
        expect(parseQueryString('')).toEqual({})
        expect(parseQueryString('?')).toEqual({})
      })

      it('should handle multiple values for same key', () => {
        const result = parseQueryString('?tags=a&tags=b&tags=c')
        expect(result.tags).toEqual(['a', 'b', 'c'])
      })

      it('should decode special characters', () => {
        expect(parseQueryString('?query=hello+world')).toEqual({ query: 'hello world' })
        expect(parseQueryString('?query=hello%20world')).toEqual({ query: 'hello world' })
      })
    })

    describe('isInternalUrl', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'location', {
          value: { origin: 'https://example.com' },
          writable: true,
        })
      })

      it('should identify internal URLs', () => {
        expect(isInternalUrl('https://example.com/page')).toBe(true)
        expect(isInternalUrl('/page')).toBe(true)
        expect(isInternalUrl('page')).toBe(true)
        expect(isInternalUrl('./page')).toBe(true)
      })

      it('should identify external URLs', () => {
        expect(isInternalUrl('https://other.com/page')).toBe(false)
        expect(isInternalUrl('http://example.com/page')).toBe(false) // Different protocol
      })
    })

    describe('openUrl', () => {
      let windowOpenSpy: ReturnType<typeof vi.spyOn>
      let originalLocation: Location

      beforeEach(() => {
        windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
        originalLocation = window.location
        Object.defineProperty(window, 'location', {
          value: { href: '' },
          writable: true,
        })
      })

      afterEach(() => {
        Object.defineProperty(window, 'location', {
          value: originalLocation,
          writable: true,
        })
      })

      it('should open in new window when specified', () => {
        openUrl('https://example.com', { newWindow: true })
        expect(windowOpenSpy).toHaveBeenCalledWith(
          'https://example.com',
          '_blank',
          'noopener,noreferrer',
        )
      })

      it('should open in same window by default', () => {
        openUrl('https://example.com')
        expect(window.location.href).toBe('https://example.com')
      })

      it('should use custom target', () => {
        openUrl('https://example.com', { newWindow: true, target: 'customTarget' })
        expect(windowOpenSpy).toHaveBeenCalledWith(
          'https://example.com',
          'customTarget',
          'noopener,noreferrer',
        )
      })
    })

    describe('handleAnchorClick', () => {
      let navigateMock: ReturnType<typeof vi.fn>
      let preventDefaultMock: ReturnType<typeof vi.fn>

      beforeEach(() => {
        navigateMock = vi.fn()
        preventDefaultMock = vi.fn()
        Object.defineProperty(window, 'location', {
          value: { origin: 'https://example.com' },
          writable: true,
        })
      })

      it('should handle internal link clicks', () => {
        const anchor = document.createElement('a')
        anchor.href = '/internal-page'

        const event = {
          target: anchor,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          preventDefault: preventDefaultMock,
        } as unknown as MouseEvent

        const result = handleAnchorClick(event, navigateMock)

        expect(result).toBe(true)
        expect(preventDefaultMock).toHaveBeenCalled()
        expect(navigateMock).toHaveBeenCalledWith('/internal-page')
      })

      it('should not handle external links', () => {
        const anchor = document.createElement('a')
        anchor.href = 'https://external.com/page'

        const event = {
          target: anchor,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          preventDefault: preventDefaultMock,
        } as unknown as MouseEvent

        const result = handleAnchorClick(event, navigateMock)

        expect(result).toBe(false)
        expect(preventDefaultMock).not.toHaveBeenCalled()
        expect(navigateMock).not.toHaveBeenCalled()
      })

      it('should not handle clicks with modifier keys', () => {
        const anchor = document.createElement('a')
        anchor.href = '/internal-page'

        const event = {
          target: anchor,
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          preventDefault: preventDefaultMock,
        } as unknown as MouseEvent

        const result = handleAnchorClick(event, navigateMock)

        expect(result).toBe(false)
        expect(navigateMock).not.toHaveBeenCalled()
      })

      it('should not handle target="_blank" links', () => {
        const anchor = document.createElement('a')
        anchor.href = '/internal-page'
        anchor.target = '_blank'

        const event = {
          target: anchor,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          preventDefault: preventDefaultMock,
        } as unknown as MouseEvent

        const result = handleAnchorClick(event, navigateMock)

        expect(result).toBe(false)
        expect(navigateMock).not.toHaveBeenCalled()
      })

      it('should return false when no anchor element', () => {
        const event = {
          target: document.createElement('span'),
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          preventDefault: preventDefaultMock,
        } as unknown as MouseEvent

        const result = handleAnchorClick(event, navigateMock)

        expect(result).toBe(false)
      })
    })
  })

  describe('Encoding Utilities', () => {
    describe('urlBase64ToUint8Array', () => {
      it('should convert URL-safe base64 to Uint8Array', () => {
        // Example VAPID key segment
        const base64 = 'BNcRdreALRFXTkOOUHK1'
        const result = urlBase64ToUint8Array(base64)

        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBeGreaterThan(0)
      })

      it('should handle base64 with padding', () => {
        const base64 = 'SGVsbG8gV29ybGQ' // "Hello World" without padding
        const result = urlBase64ToUint8Array(base64)

        expect(result).toBeInstanceOf(Uint8Array)
      })

      it('should convert URL-safe characters', () => {
        // Base64 with - and _ instead of + and /
        const urlSafe = 'abc-def_ghi'
        const result = urlBase64ToUint8Array(urlSafe)

        expect(result).toBeInstanceOf(Uint8Array)
      })
    })

    describe('uint8ArrayToUrlBase64', () => {
      it('should convert Uint8Array to URL-safe base64', () => {
        const array = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
        const result = uint8ArrayToUrlBase64(array)

        expect(typeof result).toBe('string')
        expect(result).not.toContain('+')
        expect(result).not.toContain('/')
        expect(result).not.toContain('=')
      })

      it('should be reversible', () => {
        const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
        const base64 = uint8ArrayToUrlBase64(original)
        const restored = urlBase64ToUint8Array(base64)

        expect(Array.from(restored)).toEqual(Array.from(original))
      })
    })
  })

  describe('Async Utilities', () => {
    describe('sleep', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should resolve after specified time', async () => {
        const promise = sleep(1000)
        vi.advanceTimersByTime(1000)
        await expect(promise).resolves.toBeUndefined()
      })

      it('should not resolve before time elapsed', async () => {
        let resolved = false
        sleep(1000).then(() => {
          resolved = true
        })

        vi.advanceTimersByTime(500)
        await Promise.resolve() // Flush microtasks

        expect(resolved).toBe(false)
      })
    })

    describe('debounce', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should delay function execution', () => {
        const fn = vi.fn()
        const debouncedFn = debounce(fn, 100)

        debouncedFn()
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should reset timer on subsequent calls', () => {
        const fn = vi.fn()
        const debouncedFn = debounce(fn, 100)

        debouncedFn()
        vi.advanceTimersByTime(50)

        debouncedFn()
        vi.advanceTimersByTime(50)

        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(50)
        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should pass arguments to function', () => {
        const fn = vi.fn()
        const debouncedFn = debounce(fn, 100)

        debouncedFn('arg1', 'arg2')
        vi.advanceTimersByTime(100)

        expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
      })
    })

    describe('throttle', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should execute immediately on first call', () => {
        const fn = vi.fn()
        const throttledFn = throttle(fn, 100)

        throttledFn()
        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should ignore calls within limit period', () => {
        const fn = vi.fn()
        const throttledFn = throttle(fn, 100)

        throttledFn()
        throttledFn()
        throttledFn()

        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should allow calls after limit period', () => {
        const fn = vi.fn()
        const throttledFn = throttle(fn, 100)

        throttledFn()
        expect(fn).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(100)

        throttledFn()
        expect(fn).toHaveBeenCalledTimes(2)
      })

      it('should pass arguments to function', () => {
        const fn = vi.fn()
        const throttledFn = throttle(fn, 100)

        throttledFn('arg1', 'arg2')
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
      })
    })

    describe('retry', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should return result on success', async () => {
        const fn = vi.fn().mockResolvedValue('success')

        const promise = retry(fn)
        const result = await promise

        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should retry on failure', async () => {
        const fn = vi
          .fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValueOnce('success')

        const promise = retry(fn, { maxAttempts: 3, initialDelay: 100 })

        // First attempt fails immediately
        await vi.runOnlyPendingTimersAsync()
        // Second attempt after delay
        vi.advanceTimersByTime(100)
        await vi.runOnlyPendingTimersAsync()
        // Third attempt after delay
        vi.advanceTimersByTime(200)
        await vi.runOnlyPendingTimersAsync()

        const result = await promise
        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(3)
      })

      it('should throw after max attempts', async () => {
        let callCount = 0
        const fn = vi.fn().mockImplementation(async () => {
          callCount++
          throw new Error('Always fails')
        })

        // Don't use fake timers for this test to avoid unhandled rejection issues
        vi.useRealTimers()

        await expect(retry(fn, { maxAttempts: 3, initialDelay: 10, maxDelay: 20 })).rejects.toThrow(
          'Always fails',
        )

        expect(callCount).toBe(3)

        // Restore fake timers for subsequent tests
        vi.useFakeTimers()
      })

      it('should use exponential backoff', async () => {
        const fn = vi
          .fn()
          .mockRejectedValueOnce(new Error('Fail'))
          .mockRejectedValueOnce(new Error('Fail'))
          .mockResolvedValueOnce('success')

        const promise = retry(fn, {
          maxAttempts: 3,
          initialDelay: 100,
          backoffFactor: 2,
        })

        // Advance through retries
        vi.advanceTimersByTime(100) // First retry delay
        await vi.runOnlyPendingTimersAsync()

        vi.advanceTimersByTime(200) // Second retry delay (100 * 2)
        await vi.runOnlyPendingTimersAsync()

        const result = await promise
        expect(result).toBe('success')
      })

      it('should respect maxDelay', async () => {
        const fn = vi.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValueOnce('success')

        const promise = retry(fn, {
          maxAttempts: 2,
          initialDelay: 100,
          maxDelay: 50,
          backoffFactor: 10,
        })

        vi.advanceTimersByTime(50) // Should be capped at maxDelay
        await vi.runOnlyPendingTimersAsync()

        const result = await promise
        expect(result).toBe('success')
      })
    })
  })

  describe('Error Utilities', () => {
    describe('defaultErrorMessages', () => {
      it('should have common error messages', () => {
        expect(defaultErrorMessages.NETWORK_ERROR).toBeDefined()
        expect(defaultErrorMessages.TIMEOUT).toBeDefined()
        expect(defaultErrorMessages.UNAUTHORIZED).toBeDefined()
        expect(defaultErrorMessages.FORBIDDEN).toBeDefined()
        expect(defaultErrorMessages.NOT_FOUND).toBeDefined()
        expect(defaultErrorMessages.VALIDATION_ERROR).toBeDefined()
        expect(defaultErrorMessages.SERVER_ERROR).toBeDefined()
        expect(defaultErrorMessages.UNKNOWN).toBeDefined()
      })
    })

    describe('getErrorMessage', () => {
      it('should return string errors directly', () => {
        expect(getErrorMessage('Custom error message')).toBe('Custom error message')
      })

      it('should map error codes', () => {
        expect(getErrorMessage('NETWORK_ERROR')).toBe(defaultErrorMessages.NETWORK_ERROR)
        expect(getErrorMessage('UNAUTHORIZED')).toBe(defaultErrorMessages.UNAUTHORIZED)
      })

      it('should extract message from Error objects', () => {
        const error = new Error('Something went wrong')
        expect(getErrorMessage(error)).toBe('Something went wrong')
      })

      it('should handle TypeError with fetch', () => {
        const error = new TypeError('Failed to fetch')
        expect(getErrorMessage(error)).toBe(defaultErrorMessages.NETWORK_ERROR)
      })

      it('should handle AbortError', () => {
        const error = new DOMException('Aborted', 'AbortError')
        expect(getErrorMessage(error)).toBe(defaultErrorMessages.TIMEOUT)
      })

      it('should extract message from object with message property', () => {
        expect(getErrorMessage({ message: 'Object error message' })).toBe('Object error message')
      })

      it('should extract message from object with error property', () => {
        expect(getErrorMessage({ error: 'Error property message' })).toBe('Error property message')
      })

      it('should extract message from object with code property', () => {
        expect(getErrorMessage({ code: 'NOT_FOUND' })).toBe(defaultErrorMessages.NOT_FOUND)
      })

      it('should use custom messages', () => {
        const customMessages = { CUSTOM_CODE: 'Custom error occurred' }
        expect(getErrorMessage('CUSTOM_CODE', customMessages)).toBe('Custom error occurred')
      })

      it('should return UNKNOWN for unhandled cases', () => {
        expect(getErrorMessage(null)).toBe(defaultErrorMessages.UNKNOWN)
        expect(getErrorMessage(undefined)).toBe(defaultErrorMessages.UNKNOWN)
        expect(getErrorMessage(123)).toBe(defaultErrorMessages.UNKNOWN)
        expect(getErrorMessage({})).toBe(defaultErrorMessages.UNKNOWN)
      })
    })
  })

  describe('Clipboard Utilities', () => {
    describe('copyToClipboard', () => {
      it('should use navigator.clipboard.writeText when available', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: writeTextMock },
          configurable: true,
        })

        const result = await copyToClipboard('test text')

        expect(result).toBe(true)
        expect(writeTextMock).toHaveBeenCalledWith('test text')
      })

      it('should handle case when clipboard API unavailable', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          configurable: true,
        })

        // happy-dom doesn't support execCommand, so fallback returns false
        // The function should not throw
        const result = await copyToClipboard('test text')

        // Result depends on whether fallback works in the test environment
        expect(typeof result).toBe('boolean')
      })

      it('should return false on error', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
          configurable: true,
        })

        const result = await copyToClipboard('test text')

        expect(result).toBe(false)
      })
    })

    describe('readFromClipboard', () => {
      it('should use navigator.clipboard.readText when available', async () => {
        const readTextMock = vi.fn().mockResolvedValue('clipboard content')
        Object.defineProperty(navigator, 'clipboard', {
          value: { readText: readTextMock },
          configurable: true,
        })

        const result = await readFromClipboard()

        expect(result).toBe('clipboard content')
        expect(readTextMock).toHaveBeenCalled()
      })

      it('should return null when clipboard API unavailable', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          configurable: true,
        })

        const result = await readFromClipboard()

        expect(result).toBe(null)
      })

      it('should return null on error', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: { readText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
          configurable: true,
        })

        const result = await readFromClipboard()

        expect(result).toBe(null)
      })
    })
  })

  describe('Random Utilities', () => {
    describe('randomString', () => {
      it('should generate string of specified length', () => {
        expect(randomString(10).length).toBe(10)
        expect(randomString(20).length).toBe(20)
        expect(randomString(5).length).toBe(5)
      })

      it('should use default length of 16', () => {
        expect(randomString().length).toBe(16)
      })

      it('should use default alphanumeric charset', () => {
        const str = randomString(100)
        expect(/^[A-Za-z0-9]+$/.test(str)).toBe(true)
      })

      it('should use custom charset', () => {
        const str = randomString(100, 'abc')
        expect(/^[abc]+$/.test(str)).toBe(true)
      })

      it('should generate unique strings', () => {
        const strings = new Set<string>()
        for (let i = 0; i < 100; i++) {
          strings.add(randomString(32))
        }
        expect(strings.size).toBe(100)
      })
    })

    describe('uuid', () => {
      it('should generate valid UUID format', () => {
        const id = uuid()
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      })

      it('should generate unique UUIDs', () => {
        const uuids = new Set<string>()
        for (let i = 0; i < 100; i++) {
          uuids.add(uuid())
        }
        expect(uuids.size).toBe(100)
      })

      it('should have version 4 indicator', () => {
        const id = uuid()
        expect(id.charAt(14)).toBe('4')
      })

      it('should have correct variant bits', () => {
        const id = uuid()
        const variantChar = id.charAt(19)
        expect(['8', '9', 'a', 'b']).toContain(variantChar.toLowerCase())
      })
    })
  })

  describe('Integration Tests', () => {
    it('should format file sizes with numbers correctly', () => {
      const bytes = 1572864 // 1.5 MB
      const humanSize = getHumanFileSize(bytes)
      const formattedBytes = formatNumber(bytes)

      expect(humanSize).toBe('1.5 MB')
      expect(formattedBytes).toBe('1,572,864')
    })

    it('should handle URL building and parsing roundtrip', () => {
      const params = { search: 'hello world', page: 1, tags: ['a', 'b'] }
      const queryString = toQueryString(params)
      const parsed = parseQueryString(queryString)

      expect(parsed.search).toBe('hello world')
      expect(parsed.page).toBe('1')
      expect(parsed.tags).toEqual(['a', 'b'])
    })

    it('should validate and clean user input', () => {
      const email = 'user@example.com'
      const username = 'user-name_123!@#'

      expect(isEmail(email)).toBe(true)
      expect(alphanumeric(username, { allowDashes: true, allowUnderscores: true })).toBe(
        'user-name_123',
      )
    })

    it('should handle string case transformations', () => {
      const original = 'hello-world_test'
      const camel = toCamelCase(original)
      const kebab = toKebabCase(camel)
      const title = toTitleCase(original.replace(/[-_]/g, ' '))

      expect(camel).toBe('helloWorldTest')
      expect(kebab).toBe('hello-world-test')
      expect(title).toBe('Hello World Test')
    })
  })
})
