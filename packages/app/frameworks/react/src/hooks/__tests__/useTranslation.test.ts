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
  addTranslations: vi.fn(),
  t: tFn ?? ((key: string) => key),
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
    expect(tFn).toHaveBeenCalledWith('some.error.key', undefined)
    expect(result.current).toBe('Translated message')
  })

  it('passes interpolation values when translating an I18nError', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Hello Alice')
    const values: InterpolationValues = { name: 'Alice' }
    const error = new I18nError('greeting.key', values, 'Hello fallback')
    const { result } = renderHook(() => useI18nError(error), {
      wrapper: createWrapper(createMockProvider(tFn)),
    })
    expect(tFn).toHaveBeenCalledWith('greeting.key', values)
    expect(result.current).toBe('Hello Alice')
  })

  it('uses the i18nKey as fallback when provider returns the key unchanged', () => {
    // Default mock t: returns key as-is (no translations loaded)
    const error = new I18nError('auth.error.invalidCredentials', undefined, 'Invalid credentials')
    const { result } = renderHook(() => useI18nError(error), {
      wrapper: createWrapper(createMockProvider()),
    })
    // Default tFn returns the key, so result is the key string
    expect(result.current).toBe('auth.error.invalidCredentials')
  })
})
