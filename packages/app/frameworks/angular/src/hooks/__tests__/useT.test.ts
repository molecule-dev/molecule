// @vitest-environment jsdom

/**
 * Angular port of React's `useT.test.tsx`. Every title is React's; only the
 * framework-forced mechanics change: a function is called once in an injection
 * context (a component field initializer) instead of on every render, a
 * template binding re-evaluates when a signal it read changes instead of a
 * re-render, and a mounted component replaces a render. Each React-only
 * mechanism is translated to what a caller of the API observes under it.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { provideI18n } from '../../providers.js'
import { useT, useTranslation } from '../use-translation.js'

/**
 * Locales used by every probe. `greeting` exists in both so a locale switch is
 * observable; `welcome`/`item_*` cover the existing values/count call shapes.
 */
const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    translations: {
      greeting: 'Hello',
      welcome: 'Welcome, {{name}}!',
      item_one: '{{count}} item',
      item_other: '{{count}} items',
    },
  },
  { code: 'fr', name: 'French', translations: { greeting: 'Bonjour' } },
]

/**
 * Mounts one probe under one i18n provider and renders it once.
 *
 * @param component - The probe component class.
 * @param provider - The provider the probe reads.
 * @returns The mounted fixture.
 */
function mount<P>(component: Type<P>, provider: I18nProvider): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), provideI18n(provider)],
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

/** A probe whose only locale dependency is `useT()`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-uset-only',
  template: '<span data-testid="text">{{ text() }}</span>',
})
class OnlyUseTProbe {
  private readonly t = useT()

  /**
   * The greeting the view renders.
   *
   * @returns The translated greeting.
   */
  text(): string {
    return this.t('greeting', undefined, { defaultValue: 'Hello' })
  }
}

/** Records the function identity it saw on each render. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-useT-identity',
  template: '<span data-testid="text">{{ text() }}</span>',
})
class UseTIdentityProbe {
  readonly seen: unknown[] = []
  readonly t = useT()

  /**
   * Records this render's function identity.
   *
   * @returns The translated greeting.
   */
  text(): string {
    this.seen.push(this.t)
    return this.t('greeting', undefined, { defaultValue: 'Hello' })
  }
}

/** Runs an effect that depends on the returned function's identity. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-useT-effect',
  template: '<span data-testid="text">{{ text() }}</span>',
})
class UseTEffectProbe {
  readonly t = useT()
  effectRuns = 0
  captured: unknown

  constructor() {
    // Angular effects track signal reads, not function identity: this one
    // captures `t` and reads no signal, so it is the caller-observable
    // counterpart of React's `useEffect(..., [t])`.
    effect(() => {
      this.captured = this.t
      this.effectRuns += 1
    })
  }

  /**
   * The greeting the view renders.
   *
   * @returns The translated greeting.
   */
  text(): string {
    return this.t('greeting', undefined, { defaultValue: 'Hello' })
  }
}

/** Renders every documented `useT` call shape at once. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-useT-shapes',
  template: `
    <span data-testid="values">{{ values() }}</span>
    <span data-testid="default">{{ fallback() }}</span>
    <span data-testid="plural">{{ plural() }}</span>
    <span data-testid="count-fallback">{{ countFallback() }}</span>
  `,
})
class UseTShapesProbe {
  private readonly t = useT()

  /**
   * The values-map call shape.
   *
   * @returns The interpolated welcome.
   */
  values(): string {
    return this.t('welcome', { name: 'Alice' })
  }

  /**
   * The explicit-default call shape.
   *
   * @returns The fallback.
   */
  fallback(): string {
    return this.t('missing.key', undefined, { defaultValue: 'Fallback' })
  }

  /**
   * The plural call shape.
   *
   * @returns The pluralized count.
   */
  plural(): string {
    return this.t('item', { count: 2 }, { count: 2 })
  }

  /**
   * The plural default-value call shape.
   *
   * @returns The interpolated fallback.
   */
  countFallback(): string {
    return this.t('missing.item', undefined, { defaultValue: '{{count}} things', count: 3 })
  }
}

/** Renders every inline-fallback `useT` call shape at once. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-useT-shorthand',
  template: `
    <span data-testid="fallback">{{ fallback() }}</span>
    <span data-testid="translated">{{ translated() }}</span>
    <span data-testid="interpolated">{{ interpolated() }}</span>
    <span data-testid="plural">{{ plural() }}</span>
  `,
})
class UseTShorthandProbe {
  private readonly t = useT()

  /**
   * A missing key with a string fallback.
   *
   * @returns The fallback.
   */
  fallback(): string {
    return this.t('missing.key', 'English fallback')
  }

  /**
   * A present key, where the registered text wins.
   *
   * @returns The translated greeting.
   */
  translated(): string {
    return this.t('greeting', 'English fallback')
  }

  /**
   * A string fallback with interpolation.
   *
   * @returns The interpolated fallback.
   */
  interpolated(): string {
    return this.t('missing.template', '{{count}} items', { count: 3 })
  }

  /**
   * A present plural key reached through the string shorthand.
   *
   * @returns The pluralized count.
   */
  plural(): string {
    return this.t('item', '{{count}} things', { count: 1 })
  }
}

/** Renders the locale together with text read through `useTranslation().t`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-useTranslation-control',
  template: '<span data-testid="text">{{ line() }}</span>',
})
class UseTranslationControlProbe {
  private readonly i18n = useTranslation()

  /**
   * The locale and greeting the view renders together.
   *
   * @returns The rendered line.
   */
  line(): string {
    return `${this.i18n.locale()}:${this.i18n.t('greeting', undefined, {
      defaultValue: 'Hello',
    })}`
  }
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

describe('useT', () => {
  it('re-renders on a locale change when the component uses only useT()', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(OnlyUseTProbe, provider)
    expect(rendered(fixture, 'text')).toBe('Hello')

    await provider.setLocale('fr')
    await fixture.whenStable()
    expect(rendered(fixture, 'text')).toBe('Bonjour')
  })

  it('re-renders when addTranslations adds keys for the active locale', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Reads a key registered after the view exists. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-useT-late-key',
      template: '<span data-testid="late">{{ late() }}</span>',
    })
    class LateProbe {
      private readonly t = useT()

      /**
       * The late key's text.
       *
       * @returns The translated text or its fallback.
       */
      late(): string {
        return this.t('lateKey', undefined, { defaultValue: 'Pending' })
      }
    }

    const fixture = mount(LateProbe, provider)
    expect(rendered(fixture, 'late')).toBe('Pending')

    provider.addTranslations('en', { lateKey: 'Loaded' })
    await fixture.whenStable()
    expect(rendered(fixture, 'late')).toBe('Loaded')
  })

  it('keeps the returned identity across re-renders AND locale changes', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(UseTIdentityProbe, provider)
    const { seen } = fixture.componentInstance
    const first = seen[seen.length - 1]

    fixture.detectChanges()
    expect(seen[seen.length - 1]).toBe(first)

    const rendersBefore = seen.length
    await provider.setLocale('fr')
    await fixture.whenStable()
    // The view re-rendered (so text is fresh) AND the function identity survived.
    expect(seen.length).toBeGreaterThan(rendersBefore)
    expect(seen[seen.length - 1]).toBe(first)
    expect(rendered(fixture, 'text')).toBe('Bonjour')
  })

  it('does not re-run an effect that depends on the returned function', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(UseTEffectProbe, provider)
    await fixture.whenStable()
    fixture.detectChanges()
    await provider.setLocale('fr')
    await fixture.whenStable()
    // The l63 failure class: a per-render identity re-ran this effect forever.
    expect(fixture.componentInstance.effectRuns).toBe(1)
    expect(fixture.componentInstance.captured).toBe(fixture.componentInstance.t)
    expect(rendered(fixture, 'text')).toBe('Bonjour')
  })

  it('moves the subscription when the provider instance is replaced', () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: { greeting: 'Salut from B' } },
    ])
    const unsubscribeA = vi.fn()
    const onLocaleChangeA = providerA.onLocaleChange.bind(providerA)
    providerA.onLocaleChange = (listener: (locale: string) => void): (() => void) => {
      const unsubscribe = onLocaleChangeA(listener)
      return () => {
        unsubscribeA()
        unsubscribe()
      }
    }

    /** Reads the greeting through `useT()`. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-useT-provider-probe',
      template: '<span data-testid="text">{{ text() }}</span>',
    })
    class ProviderProbe {
      private readonly t = useT()

      /**
       * The greeting the view renders.
       *
       * @returns The translated greeting.
       */
      text(): string {
        return this.t('greeting', undefined, { defaultValue: 'Hello' })
      }
    }

    const fixtureA = mount(ProviderProbe, providerA)
    expect(rendered(fixtureA, 'text')).toBe('Hello')

    fixtureA.destroy()
    expect(unsubscribeA).toHaveBeenCalledTimes(1)

    // Angular's injector token is immutable, so a replaced provider is a fresh
    // module behind the same component — the caller-observable equivalent of
    // React's provider re-render.
    TestBed.resetTestingModule()
    const fixtureB = mount(ProviderProbe, providerB)
    expect(rendered(fixtureB, 'text')).toBe('Salut from B')

    providerB.addTranslations('en', { greeting: 'Salut encore' })
    fixtureB.detectChanges()
    expect(rendered(fixtureB, 'text')).toBe('Salut encore')
  })

  it('unsubscribes when the component unmounts', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const unsubscribe = vi.fn()
    const onLocaleChange = provider.onLocaleChange.bind(provider)
    provider.onLocaleChange = (listener: (locale: string) => void): (() => void) => {
      const stop = onLocaleChange(listener)
      return () => {
        unsubscribe()
        stop()
      }
    }

    const fixture = mount(OnlyUseTProbe, provider)
    fixture.destroy()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('preserves the existing values/defaultValue/count call shapes', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(UseTShapesProbe, provider)
    expect(rendered(fixture, 'values')).toBe('Welcome, Alice!')
    expect(rendered(fixture, 'default')).toBe('Fallback')
    expect(rendered(fixture, 'plural')).toBe('2 items')
    expect(rendered(fixture, 'count-fallback')).toBe('3 things')
  })

  it('accepts an inline fallback string as the second argument', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(UseTShorthandProbe, provider)
    expect(rendered(fixture, 'fallback')).toBe('English fallback')
    expect(rendered(fixture, 'translated')).toBe('Hello')
    expect(rendered(fixture, 'interpolated')).toBe('3 items')
    expect(rendered(fixture, 'plural')).toBe('1 item')
  })
})

describe('useTranslation (control — existing behaviour)', () => {
  it('still re-renders on a locale change and translates', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(UseTranslationControlProbe, provider)
    expect(rendered(fixture, 'text')).toBe('en:Hello')

    await provider.setLocale('fr')
    await fixture.whenStable()
    expect(rendered(fixture, 'text')).toBe('fr:Bonjour')
  })
})
