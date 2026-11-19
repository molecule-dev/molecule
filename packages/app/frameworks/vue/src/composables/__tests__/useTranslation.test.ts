// @vitest-environment jsdom
/**
 * The translation composables outside an I18nProvider, and `useI18nError`.
 *
 * Ports `useTranslation.test.ts` from `@molecule/app-react` (the reactive-args
 * original lives in `src/__tests__/`; these are the live-provider cases).
 *
 * @module
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Component, ComputedRef } from 'vue'
import { defineComponent, h, nextTick } from 'vue'

import type { I18nProvider, InterpolationValues, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider, getProvider, I18nError, setProvider } from '@molecule/app-i18n'

import { moleculePlugin } from '../../plugin.js'
import { useI18nError, useI18nProvider, useT, useTranslation } from '../useTranslation.js'

const BONDED_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'Français', translations: { greeting: 'Bonjour' } },
]

/** The provider bonded before this file ran, restored after every test. */
const originalProvider = getProvider()

const wrappers: VueWrapper[] = []

const mountWith = (component: Component, provider?: I18nProvider): VueWrapper => {
  const wrapper = provider
    ? mount(component, { global: { plugins: [[moleculePlugin, { i18n: provider }]] } })
    : mount(component)
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  setProvider(originalProvider)
})

/** Minimal mock I18nProvider — only the methods `useTranslation()` actually reads. */
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

/** Mounts a probe that reads `useI18nError(error)` under the given provider. */
function mountError(
  error: Error | null | undefined,
  provider: I18nProvider,
): { current?: ComputedRef<string | null> } {
  const result: { current?: ComputedRef<string | null> } = {}
  const Probe = defineComponent({
    setup() {
      result.current = useI18nError(error)
      return () => null
    },
  })
  mountWith(Probe, provider)
  return result
}

describe('the translation composables outside an I18nProvider', () => {
  // A component that renders without an I18nProvider used the static `t`, which reads the
  // bonded provider. The composables read that same provider there, and they also re-render the
  // component on a locale switch, which the static `t` never did.
  const bondedProvider = (): I18nProvider => {
    const provider = createSimpleI18nProvider('en', BONDED_LOCALES)
    setProvider(provider)
    return provider
  }

  it('reads the bonded provider instead of throwing', () => {
    const provider = bondedProvider()
    const holder: { current?: I18nProvider } = {}
    const Probe = defineComponent({
      setup() {
        holder.current = useI18nProvider()
        return () => null
      },
    })
    mountWith(Probe)
    expect(holder.current).toBe(provider)
  })

  it('re-renders with the new language when the bonded provider switches locale', async () => {
    const provider = bondedProvider()
    const TranslationProbe = defineComponent({
      setup() {
        const { t } = useTranslation()
        return () => h('span', { 'data-testid': 'translation' }, t('greeting'))
      },
    })
    const ShorthandProbe = defineComponent({
      setup() {
        const t = useT()
        return () => h('span', { 'data-testid': 'shorthand' }, t('greeting', 'Hello'))
      },
    })
    const translation = mountWith(TranslationProbe)
    const shorthand = mountWith(ShorthandProbe)
    await nextTick()
    expect(translation.get('[data-testid="translation"]').text()).toBe('Hello')
    expect(shorthand.get('[data-testid="shorthand"]').text()).toBe('Hello')

    await provider.setLocale('fr')
    await nextTick()
    expect(translation.get('[data-testid="translation"]').text()).toBe('Bonjour')
    expect(shorthand.get('[data-testid="shorthand"]').text()).toBe('Bonjour')
  })

  it('still prefers the provider an enclosing I18nProvider supplies', async () => {
    bondedProvider()
    const scoped = createMockProvider(() => 'scoped')
    const Probe = defineComponent({
      setup() {
        const { t } = useTranslation()
        return () => h('span', { 'data-testid': 'text' }, t('greeting'))
      },
    })
    const wrapper = mountWith(Probe, scoped)
    await nextTick()
    expect(wrapper.get('[data-testid="text"]').text()).toBe('scoped')
  })
})

describe('useI18nError', () => {
  it('returns null when error is null', () => {
    const { current } = mountError(null, createMockProvider())
    expect(current?.value).toBeNull()
  })

  it('returns null when error is undefined', () => {
    const { current } = mountError(undefined, createMockProvider())
    expect(current?.value).toBeNull()
  })

  it('returns error.message for a plain Error', () => {
    const error = new Error('Something went wrong')
    const { current } = mountError(error, createMockProvider())
    expect(current?.value).toBe('Something went wrong')
  })

  it('translates the key for an I18nError with no values', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Translated message')
    const error = new I18nError('some.error.key', undefined, 'English fallback')
    const { current } = mountError(error, createMockProvider(tFn))
    // A Vue computed translates when it is first read (a component reads it while rendering).
    expect(current?.value).toBe('Translated message')
    expect(tFn).toHaveBeenCalledWith('some.error.key', undefined, {
      defaultValue: 'English fallback',
    })
  })

  it('passes interpolation values when translating an I18nError', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Hello Alice')
    const values: InterpolationValues = { name: 'Alice' }
    const error = new I18nError('greeting.key', values, 'Hello fallback')
    const { current } = mountError(error, createMockProvider(tFn))
    expect(current?.value).toBe('Hello Alice')
    expect(tFn).toHaveBeenCalledWith('greeting.key', values, {
      defaultValue: 'Hello fallback',
    })
  })

  it("falls back to the error's own message — NEVER the raw key — when the dictionary lacks the key", () => {
    // The regression this guards: a server errorKey the client dictionary
    // doesn't carry once rendered literally ("user.error.passwordTooShort")
    // because the composable translated without a defaultValue. The I18nError's
    // message (the throw site's fallback — for server errors, the server's
    // own translated text) must surface instead.
    const error = new I18nError('user.error.passwordTooShort', undefined, 'Password is too short')
    const { current } = mountError(error, createMockProvider())
    expect(current?.value).toBe('Password is too short')
  })

  it('still shows the key for an I18nError thrown with no fallback text (worst case)', () => {
    // I18nError's message defaults to the key when no fallback is given —
    // nothing better exists to show. Throw sites should always pass fallback.
    const error = new I18nError('some.error.key')
    const { current } = mountError(error, createMockProvider())
    expect(current?.value).toBe('some.error.key')
  })
})
