// @vitest-environment jsdom

/**
 * Angular port of React's `useTranslation.test.ts`. Every title is React's;
 * only the framework-forced mechanics change: a function is called once in an
 * injection context (a component field initializer) instead of on every
 * render, and a template binding re-evaluates when a signal it read changes
 * instead of a re-render. The bonded-provider cases mount with no
 * `I18N_PROVIDER`, so `useI18nProvider` falls back to the static bond exactly
 * as React's `useContext(I18nContext) ?? getProvider()` does.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { I18nProvider, InterpolationValues, TranslateOptions } from '@molecule/app-i18n'
import { createSimpleI18nProvider, I18nError, setProvider } from '@molecule/app-i18n'

import { provideI18n } from '../../providers.js'
import { useI18nError, useI18nProvider, useT, useTranslation } from '../use-translation.js'

/**
 * Mounts one probe component under the given providers and renders it once.
 *
 * @param component - The probe component class.
 * @param providers - The providers the probe reads (usually `provideI18n`).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * The text of the element carrying `data-testid="<id>"`.
 *
 * @param fixture - The mounted probe.
 * @param id - The test id.
 * @returns Its text content, or '' when the element is absent.
 */
function rendered(fixture: ComponentFixture<unknown>, id: string): string {
  return (
    (fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as HTMLElement | null)
      ?.textContent ?? ''
  )
}

/**
 * Bonds a two-locale provider the way an app's composition root does.
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

/**
 * Minimal mock `I18nProvider` — only the members the hooks actually read.
 *
 * @param tFn - The translation spy to use, or a key/default-value fallback.
 * @returns A provider satisfying `I18nProvider`.
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
  formatNumber: (v: number) => String(v),
  formatDate: (v: Date | number | string) => String(v),
  formatRelativeTime: (v: Date | number) => String(v),
  formatList: (v: string[]) => v.join(', '),
  onLocaleChange: () => () => {},
  getDirection: () => 'ltr',
})

/** Reads the bonded provider alone. */
@Component({ selector: 'app-test-bonded-provider', template: '' })
class BondedProviderProbe {
  readonly provider = useI18nProvider()
}

/** Renders both translation forms, the shapes a component uses. */
@Component({
  selector: 'app-test-bonded-locale',
  template:
    '<span data-testid="translation">{{ translationText() }}</span>' +
    '<span data-testid="shorthand">{{ shorthandText() }}</span>',
})
class BondedLocaleProbe {
  private readonly translation = useTranslation()
  private readonly t = useT()

  /**
   * The `useTranslation().t` greeting the view renders.
   *
   * @returns The translated greeting.
   */
  translationText(): string {
    return this.translation.t('greeting')
  }

  /**
   * The `useT()` greeting the view renders.
   *
   * @returns The translated greeting.
   */
  shorthandText(): string {
    return this.t('greeting', 'Hello')
  }
}

/** Reads a translation through the provider an enclosing `provideI18n` supplies. */
@Component({
  selector: 'app-test-scoped-provider',
  template: '<span data-testid="text">{{ text() }}</span>',
})
class ScopedProviderProbe {
  private readonly translation = useTranslation()

  /**
   * The greeting the view renders.
   *
   * @returns The translated greeting.
   */
  text(): string {
    return this.translation.t('greeting')
  }
}

/**
 * Mounts a probe that translates one error through `useI18nError`.
 *
 * @param provider - The provider the probe reads.
 * @param error - The error to translate, or `null`/`undefined`.
 * @returns The mounted fixture carrying the resulting message signal.
 */
function mountI18nError(
  provider: I18nProvider,
  error: Error | null | undefined,
): ComponentFixture<MessageProbe> {
  /** Exposes the translated error message. */
  @Component({ selector: 'app-test-i18n-error', template: '' })
  class I18nErrorProbe implements MessageProbe {
    readonly message = useI18nError(error)
  }

  return mount(I18nErrorProbe, provideI18n(provider))
}

/** The observable shape `useI18nError` returns. */
interface MessageProbe {
  readonly message: () => string | null
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('the translation hooks outside an I18nProvider', () => {
  it('reads the bonded provider instead of throwing', () => {
    const provider = bondedProvider()
    const fixture = mount(BondedProviderProbe)
    expect(fixture.componentInstance.provider).toBe(provider)
  })

  it('re-renders with the new language when the bonded provider switches locale', async () => {
    const provider = bondedProvider()
    const fixture = mount(BondedLocaleProbe)
    expect(rendered(fixture, 'translation')).toBe('Hello')
    expect(rendered(fixture, 'shorthand')).toBe('Hello')
    await provider.setLocale('fr')
    await fixture.whenStable()
    expect(rendered(fixture, 'translation')).toBe('Bonjour')
    expect(rendered(fixture, 'shorthand')).toBe('Bonjour')
  })

  it('still prefers the provider an enclosing I18nProvider supplies', () => {
    bondedProvider()
    const scoped = createMockProvider(() => 'scoped')
    const fixture = mount(ScopedProviderProbe, provideI18n(scoped))
    expect(rendered(fixture, 'text')).toBe('scoped')
  })
})

describe('useI18nError', () => {
  it('returns null when error is null', () => {
    const fixture = mountI18nError(createMockProvider(), null)
    expect(fixture.componentInstance.message()).toBeNull()
  })

  it('returns null when error is undefined', () => {
    const fixture = mountI18nError(createMockProvider(), undefined)
    expect(fixture.componentInstance.message()).toBeNull()
  })

  it('returns error.message for a plain Error', () => {
    const error = new Error('Something went wrong')
    const fixture = mountI18nError(createMockProvider(), error)
    expect(fixture.componentInstance.message()).toBe('Something went wrong')
  })

  it('translates the key for an I18nError with no values', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Translated message')
    const error = new I18nError('some.error.key', undefined, 'English fallback')
    const fixture = mountI18nError(createMockProvider(tFn), error)
    const message = fixture.componentInstance.message()
    expect(tFn).toHaveBeenCalledWith('some.error.key', undefined, {
      defaultValue: 'English fallback',
    })
    expect(message).toBe('Translated message')
  })

  it('passes interpolation values when translating an I18nError', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Hello Alice')
    const values: InterpolationValues = { name: 'Alice' }
    const error = new I18nError('greeting.key', values, 'Hello fallback')
    const fixture = mountI18nError(createMockProvider(tFn), error)
    const message = fixture.componentInstance.message()
    expect(tFn).toHaveBeenCalledWith('greeting.key', values, {
      defaultValue: 'Hello fallback',
    })
    expect(message).toBe('Hello Alice')
  })

  it("falls back to the error's own message — NEVER the raw key — when the dictionary lacks the key", () => {
    // The regression this guards: a server errorKey the client dictionary
    // doesn't carry once rendered literally ("user.error.passwordTooShort")
    // because the hook translated without a defaultValue. The I18nError's
    // message (the throw site's fallback — for server errors, the server's
    // own translated text) must surface instead.
    const error = new I18nError('user.error.passwordTooShort', undefined, 'Password is too short')
    const fixture = mountI18nError(createMockProvider(), error)
    expect(fixture.componentInstance.message()).toBe('Password is too short')
  })

  it('still shows the key for an I18nError thrown with no fallback text (worst case)', () => {
    // I18nError's message defaults to the key when no fallback is given —
    // nothing better exists to show. Throw sites should always pass fallback.
    const error = new I18nError('some.error.key')
    const fixture = mountI18nError(createMockProvider(), error)
    expect(fixture.componentInstance.message()).toBe('some.error.key')
  })
})
