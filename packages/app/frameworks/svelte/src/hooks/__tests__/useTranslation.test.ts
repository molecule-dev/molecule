// @vitest-environment jsdom
/**
 * `useI18nProvider`/`useTranslation`/`useT`/`useI18nError`: React's
 * `useTranslation.test.ts` cases in Svelte's idiom.
 *
 * A Svelte hook runs once, during component init, and publishes through
 * stores; this file takes the same surface the package's `hooks.test.ts` uses:
 * the `svelte` context and lifecycle functions are stubbed (there is no
 * component tree here), so `renderHook` below is React's `renderHook` and
 * `unmount` is its `unmount`, while the stores are read with `get()`.
 *
 * @module
 */

import { get } from 'svelte/store'
import { describe, expect, it, vi } from 'vitest'

import type { I18nProvider, InterpolationValues, TranslateOptions } from '@molecule/app-i18n'
import { createSimpleI18nProvider, I18nError, setProvider } from '@molecule/app-i18n'

import { setMoleculeContext, useI18nProvider } from '../../context.js'
import type { MoleculeConfig } from '../../types.js'
import { useI18nError, useT, useTranslation } from '../useTranslation.js'

// --- Mock svelte's component context and lifecycle ---
const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

/**
 * Runs `run` once, the way a component's init does, under `config`'s services.
 *
 * @param config - The services to register through `setMoleculeContext`.
 * @param run - Calls the hook under test; its return value is kept.
 * @returns The hook's result, plus the teardown that runs its destroy callbacks.
 */
function renderHook<T>(config: MoleculeConfig, run: () => T): { result: T; unmount: () => void } {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext(config)
  const result = run()
  return {
    result,
    unmount: () => {
      for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
    },
  }
}

describe('the translation hooks outside an I18nProvider', () => {
  // A component that renders without a setMoleculeContext i18n entry used the
  // static `t`, which reads the bonded provider. The hooks read that same
  // provider there, and they also re-read it on a locale switch, which the
  // static `t` never did.
  /**
   * Bonds a provider with `greeting` in English and French.
   *
   * @returns The bonded provider.
   */
  const bondedProvider = (): I18nProvider => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: { greeting: 'Hello' } },
      { code: 'fr', name: 'Français', translations: { greeting: 'Bonjour' } },
    ])
    setProvider(provider)
    return provider
  }

  it('reads the bonded provider instead of throwing', () => {
    const provider = bondedProvider()
    const { result, unmount } = renderHook({}, () => useI18nProvider())
    expect(result).toBe(provider)
    unmount()
  })

  it('re-renders with the new language when the bonded provider switches locale', async () => {
    const provider = bondedProvider()
    const { result, unmount } = renderHook({}, () => ({
      translation: useTranslation().t,
      shorthand: useT(),
    }))
    expect(result.translation('greeting')).toBe('Hello')
    expect(result.shorthand('greeting', 'Hello')).toBe('Hello')

    await provider.setLocale('fr')
    // The hooks read the bonded provider again on every call, like a re-render.
    expect(result.translation('greeting')).toBe('Bonjour')
    expect(result.shorthand('greeting', 'Hello')).toBe('Bonjour')
    unmount()
  })

  it('still prefers the provider an enclosing I18nProvider supplies', () => {
    bondedProvider()
    const scoped = createMockProvider(() => 'scoped')
    const { result, unmount } = renderHook({ i18n: scoped }, () => useTranslation().t('greeting'))
    expect(result).toBe('scoped')
    unmount()
  })
})

// Minimal mock I18nProvider — only the methods the translation hooks read
/**
 * A minimal i18n provider whose `t` can be stubbed.
 *
 * @param tFn - The translation function, or the default one.
 * @returns The provider.
 */
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
    ((key: string, _values?: InterpolationValues, options?: TranslateOptions) =>
      options?.defaultValue ?? key),
  exists: () => true,
  formatNumber: (value: number) => String(value),
  formatDate: (value: Date | number | string) => String(value),
  formatRelativeTime: (value: Date | number) => String(value),
  formatList: (values: string[]) => values.join(', '),
  onLocaleChange: () => () => {},
  getDirection: () => 'ltr',
})

/**
 * The message `useI18nError` shows for one error under one provider.
 *
 * @param error - The error to translate, or null/undefined.
 * @param provider - The provider the hook reads.
 * @returns The translated message, or null.
 */
function errorMessage(error: Error | null | undefined, provider: I18nProvider): string | null {
  const { result, unmount } = renderHook({ i18n: provider }, () => useI18nError(error))
  const message = get(result)
  unmount()
  return message
}

describe('useI18nError', () => {
  it('returns null when error is null', () => {
    expect(errorMessage(null, createMockProvider())).toBeNull()
  })

  it('returns null when error is undefined', () => {
    expect(errorMessage(undefined, createMockProvider())).toBeNull()
  })

  it('returns error.message for a plain Error', () => {
    const error = new Error('Something went wrong')
    expect(errorMessage(error, createMockProvider())).toBe('Something went wrong')
  })

  it('translates the key for an I18nError with no values', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Translated message')
    const error = new I18nError('some.error.key', undefined, 'English fallback')
    expect(errorMessage(error, createMockProvider(tFn))).toBe('Translated message')
    expect(tFn).toHaveBeenCalledWith('some.error.key', undefined, {
      defaultValue: 'English fallback',
    })
  })

  it('passes interpolation values when translating an I18nError', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Hello Alice')
    const values: InterpolationValues = { name: 'Alice' }
    const error = new I18nError('greeting.key', values, 'Hello fallback')
    expect(errorMessage(error, createMockProvider(tFn))).toBe('Hello Alice')
    expect(tFn).toHaveBeenCalledWith('greeting.key', values, {
      defaultValue: 'Hello fallback',
    })
  })

  it("falls back to the error's own message — NEVER the raw key — when the dictionary lacks the key", () => {
    // The regression this guards: a server errorKey the client dictionary
    // doesn't carry once rendered literally ("user.error.passwordTooShort")
    // because the hook translated without a defaultValue. The I18nError's
    // message (the throw site's fallback — for server errors, the server's
    // own translated text) must surface instead.
    const error = new I18nError('user.error.passwordTooShort', undefined, 'Password is too short')
    expect(errorMessage(error, createMockProvider())).toBe('Password is too short')
  })

  it('still shows the key for an I18nError thrown with no fallback text (worst case)', () => {
    // I18nError's message defaults to the key when no fallback is given —
    // nothing better exists to show. Throw sites should always pass fallback.
    const error = new I18nError('some.error.key')
    expect(errorMessage(error, createMockProvider())).toBe('some.error.key')
  })
})
