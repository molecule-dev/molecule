// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { I18nProvider, InterpolationValues } from '@molecule/app-i18n'
import { I18nError } from '@molecule/app-i18n'

import { I18nContext } from '../../contexts.js'
import { useI18nError } from '../useTranslation.js'

// Minimal mock I18nProvider — only the methods useTranslation() actually reads
const createMockProvider = (tFn?: I18nProvider['t']): I18nProvider => ({
  getLocale: () => 'en',
  setLocale: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getLocales: () => [{ code: 'en', name: 'English' }],
  addLocale: vi.fn(),
  removeLocale: vi.fn().mockReturnValue(true),
  addTranslations: vi.fn(),
  // Like a real provider: an unknown key resolves to the caller's defaultValue
  // (when given) before falling back to the key itself.
  t:
    tFn ??
    ((key: string, _values?: InterpolationValues, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key),
  exists: () => true,
  formatNumber: (v: number) => String(v),
  formatDate: (v: Date | number | string) => String(v),
  formatRelativeTime: (v: Date | number) => String(v),
  formatList: (v: string[]) => v.join(', '),
  onLocaleChange: () => () => {},
  getDirection: () => 'ltr',
})

const createWrapper =
  (provider: I18nProvider) =>
  ({ children }: { children: React.ReactNode }) =>
    createElement(I18nContext.Provider, { value: provider }, children)

describe('useI18nError', () => {
  it('returns null when error is null', () => {
    const { result } = renderHook(() => useI18nError(null), {
      wrapper: createWrapper(createMockProvider()),
    })
    expect(result.current).toBeNull()
  })

  it('returns null when error is undefined', () => {
    const { result } = renderHook(() => useI18nError(undefined), {
      wrapper: createWrapper(createMockProvider()),
    })
    expect(result.current).toBeNull()
  })

  it('returns error.message for a plain Error', () => {
    const error = new Error('Something went wrong')
    const { result } = renderHook(() => useI18nError(error), {
      wrapper: createWrapper(createMockProvider()),
    })
    expect(result.current).toBe('Something went wrong')
  })

  it('translates the key for an I18nError with no values', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Translated message')
    const error = new I18nError('some.error.key', undefined, 'English fallback')
    const { result } = renderHook(() => useI18nError(error), {
      wrapper: createWrapper(createMockProvider(tFn)),
    })
    expect(tFn).toHaveBeenCalledWith('some.error.key', undefined, {
      defaultValue: 'English fallback',
    })
    expect(result.current).toBe('Translated message')
  })

  it('passes interpolation values when translating an I18nError', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Hello Alice')
    const values: InterpolationValues = { name: 'Alice' }
    const error = new I18nError('greeting.key', values, 'Hello fallback')
    const { result } = renderHook(() => useI18nError(error), {
      wrapper: createWrapper(createMockProvider(tFn)),
    })
    expect(tFn).toHaveBeenCalledWith('greeting.key', values, {
      defaultValue: 'Hello fallback',
    })
    expect(result.current).toBe('Hello Alice')
  })

  it("falls back to the error's own message — NEVER the raw key — when the dictionary lacks the key", () => {
    // The regression this guards: a server errorKey the client dictionary
    // doesn't carry once rendered literally ("user.error.passwordTooShort")
    // because the hook translated without a defaultValue. The I18nError's
    // message (the throw site's fallback — for server errors, the server's
    // own translated text) must surface instead.
    const error = new I18nError('user.error.passwordTooShort', undefined, 'Password is too short')
    const { result } = renderHook(() => useI18nError(error), {
      wrapper: createWrapper(createMockProvider()),
    })
    expect(result.current).toBe('Password is too short')
  })

  it('still shows the key for an I18nError thrown with no fallback text (worst case)', () => {
    // I18nError's message defaults to the key when no fallback is given —
    // nothing better exists to show. Throw sites should always pass fallback.
    const error = new I18nError('some.error.key')
    const { result } = renderHook(() => useI18nError(error), {
      wrapper: createWrapper(createMockProvider()),
    })
    expect(result.current).toBe('some.error.key')
  })
})
