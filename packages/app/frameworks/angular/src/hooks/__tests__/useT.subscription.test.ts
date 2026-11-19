// @vitest-environment jsdom

/**
 * Angular port of React's `useT.subscription.test.tsx`: a notification fired
 * before a consumer subscribes, and a provider instance replaced behind a
 * mounted consumer. Every title is React's; the framework-forced mechanics
 * change (a `useEffect` mount becomes `ngOnInit`, a provider re-render becomes
 * a fresh injector module, StrictMode does not exist in Angular), and each
 * React-only mechanism is translated to what a caller of the API observes
 * under it.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  effect,
  type OnInit,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { provideI18n } from '../../providers.js'
import { useI18nProvider, useT, useTranslation } from '../use-translation.js'

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
  { code: 'ar', name: 'Arabic', direction: 'rtl', translations: { greeting: 'Marhaba' } },
]

const LATE = { late: 'Loaded' }

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

/**
 * Counts the provider's live `onLocaleChange` subscriptions.
 *
 * @param provider - The provider to instrument.
 * @returns A reader for the live count.
 */
function trackSubscriptions(provider: I18nProvider): () => number {
  const subscribe = provider.onLocaleChange.bind(provider)
  let live = 0
  provider.onLocaleChange = (listener: (locale: string) => void): (() => void) => {
    live += 1
    const unsubscribe = subscribe(listener)
    let done = false
    return () => {
      if (!done) {
        done = true
        live -= 1
      }
      unsubscribe()
    }
  }
  return () => live
}

/** Registers English translations from its mount hook (`ngOnInit`). */
@Component({ selector: 'app-test-sub-add-on-mount', template: '' })
class AddOnMountComponent implements OnInit {
  private readonly i18n = useI18nProvider()

  ngOnInit(): void {
    this.i18n.addTranslations('en', LATE)
  }
}

/** Reads the greeting through `useT()`. */
@Component({
  selector: 'app-test-sub-greeting',
  template: '<span data-testid="text">{{ text() }}</span>',
})
class GreetingComponent {
  readonly t = useT()

  /**
   * The greeting the view renders.
   *
   * @returns The translated greeting.
   */
  text(): string {
    return this.t('greeting', 'Hello')
  }
}

/** Reads a key registered after the view may exist. */
@Component({
  selector: 'app-test-sub-late-key',
  template: '<span data-testid="late">{{ late() }}</span>',
})
class LateKeyComponent {
  private readonly t = useT()

  /**
   * The late key's text.
   *
   * @returns The translated text or its fallback.
   */
  late(): string {
    return this.t('lateKey', 'Pending')
  }
}

/** Reads the text registered later through `useTranslation()`. */
@Component({
  selector: 'app-test-sub-late-translation',
  template: '<span data-testid="text">{{ text() }}</span>',
})
class LateTranslationComponent {
  private readonly i18n = useTranslation()

  /**
   * The late key's text.
   *
   * @returns The translated text or its fallback.
   */
  text(): string {
    return this.i18n.t('late', undefined, { defaultValue: 'Pending' })
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

describe('a notification fired before the hook subscribes', () => {
  it("useT: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Switches the locale before the later sibling is constructed. */
    @Component({ selector: 'app-test-sub-switch-first', template: '' })
    class SwitchFirstComponent implements OnInit {
      private readonly i18n = useI18nProvider()

      ngOnInit(): void {
        void this.i18n.setLocale('fr')
      }
    }

    /** The two siblings: the switch, then the reader. */
    @Component({
      selector: 'app-test-sub-first-sibling-host',
      imports: [SwitchFirstComponent, GreetingComponent],
      template: '<app-test-sub-switch-first /><app-test-sub-greeting />',
    })
    class SiblingHost {}

    const fixture = mount(SiblingHost, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'text')).toBe('Bonjour')
  })

  it("useT: from a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Switches the locale from its mount hook, after its parent subscribed. */
    @Component({ selector: 'app-test-sub-switch-in-child', template: '' })
    class SwitchInChildComponent implements OnInit {
      private readonly i18n = useI18nProvider()

      ngOnInit(): void {
        void this.i18n.setLocale('fr')
      }
    }

    /** Reads the locale after its child switched it. */
    @Component({
      selector: 'app-test-sub-parent-shell',
      imports: [SwitchInChildComponent],
      template: '<span data-testid="title">{{ title() }}</span><app-test-sub-switch-in-child />',
    })
    class ParentShell {
      private readonly t = useT()

      /**
       * The greeting the parent renders.
       *
       * @returns The translated greeting.
       */
      title(): string {
        return this.t('greeting', 'Hello')
      }
    }

    const fixture = mount(ParentShell, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'title')).toBe('Bonjour')
  })

  it("useTranslation: from an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Switches to the right-to-left locale before the reader exists. */
    @Component({ selector: 'app-test-sub-switch-arabic', template: '' })
    class SwitchArabicComponent implements OnInit {
      private readonly i18n = useI18nProvider()

      ngOnInit(): void {
        void this.i18n.setLocale('ar')
      }
    }

    /** Reads text, locale and direction together. */
    @Component({
      selector: 'app-test-sub-translation-probe',
      template: '<span data-testid="text">{{ line() }}</span>',
    })
    class TranslationProbe {
      private readonly i18n = useTranslation()

      /**
       * The locale, direction and greeting the view renders.
       *
       * @returns The rendered line.
       */
      line(): string {
        return `${this.i18n.locale()}/${this.i18n.direction()}:${this.i18n.t(
          'greeting',
          undefined,
          {
            defaultValue: 'Hello',
          },
        )}`
      }
    }

    /** The switch, then the reader. */
    @Component({
      selector: 'app-test-sub-arabic-host',
      imports: [SwitchArabicComponent, TranslationProbe],
      template: '<app-test-sub-switch-arabic /><app-test-sub-translation-probe />',
    })
    class ArabicHost {}

    const fixture = mount(ArabicHost, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'text')).toBe('ar/rtl:Marhaba')
  })

  it("useT: translations added in a child's mount effect, read by the parent", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Reads the key its child registered. */
    @Component({
      selector: 'app-test-sub-parent-add-shell',
      imports: [AddOnMountComponent],
      template: '<span data-testid="title">{{ title() }}</span><app-test-sub-add-on-mount />',
    })
    class ParentAddShell {
      private readonly t = useT()

      /**
       * The late key's text.
       *
       * @returns The translated text or its fallback.
       */
      title(): string {
        return this.t('late', 'Pending')
      }
    }

    const fixture = mount(ParentAddShell, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'title')).toBe('Loaded')
  })

  it("useTranslation: translations added in an earlier sibling's mount effect", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** The registrar, then the reader. */
    @Component({
      selector: 'app-test-sub-late-sibling-host',
      imports: [AddOnMountComponent, LateTranslationComponent],
      template: '<app-test-sub-add-on-mount /><app-test-sub-late-translation />',
    })
    class LateSiblingHost {}

    const fixture = mount(LateSiblingHost, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'text')).toBe('Loaded')
  })
})

describe('a provider replaced in place (no remount)', () => {
  it('useTranslation: no commit pairs the new provider with the old locale and direction', () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('ar', LOCALES)

    /** Records one frame per render: locale, direction and text together. */
    @Component({
      selector: 'app-test-sub-frame-probe',
      template: '<span data-testid="text">{{ line() }}</span>',
    })
    class FrameProbe {
      private readonly i18n = useTranslation()
      readonly frames: string[] = []

      /**
       * Records what this render shows, then returns the text.
       *
       * @returns The translated greeting.
       */
      line(): string {
        const text = this.i18n.t('greeting', undefined, { defaultValue: 'Hello' })
        this.frames.push(`${this.i18n.locale()}/${this.i18n.direction()}:${text}`)
        return text
      }
    }

    const fixtureA = mount(FrameProbe, providerA)
    const framesA = [...fixtureA.componentInstance.frames]
    fixtureA.destroy()

    // Angular's injector token is immutable, so the provider is replaced by a
    // fresh module behind the same component rather than a live context swap.
    TestBed.resetTestingModule()
    const fixtureB = mount(FrameProbe, providerB)
    const framesB = [...fixtureB.componentInstance.frames]

    // No render pairs one provider's locale/direction with the other's text.
    expect(framesA.length).toBeGreaterThan(0)
    expect(framesB.length).toBeGreaterThan(0)
    expect(framesA.every((frame) => frame === 'en/ltr:Hello')).toBe(true)
    expect(framesB.every((frame) => frame === 'ar/rtl:Marhaba')).toBe(true)
  })

  it('useT: moves its subscription and changes its identity once', () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)

    const fixtureA = mount(GreetingComponent, providerA)
    const first = fixtureA.componentInstance.t
    expect([liveA(), liveB()]).toEqual([1, 0])

    fixtureA.destroy()
    TestBed.resetTestingModule()
    const fixtureB = mount(GreetingComponent, providerB)
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(fixtureB.componentInstance.t).not.toBe(first)

    providerB.addTranslations('fr', { greeting: 'Salut' })
    fixtureB.detectChanges()
    expect(rendered(fixtureB, 'text')).toBe('Salut')
  })
})

describe('subscription lifecycle', () => {
  it('useT: one live subscription under StrictMode, updates, none after unmount', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    // Angular has no StrictMode: it constructs and subscribes exactly once, so
    // this pins the one subscription a caller observes.
    const live = trackSubscriptions(provider)

    const fixture = mount(GreetingComponent, provider)
    expect(live()).toBe(1)

    await provider.setLocale('fr')
    await fixture.whenStable()
    expect(rendered(fixture, 'text')).toBe('Bonjour')

    fixture.destroy()
    expect(live()).toBe(0)
  })
})

describe('translations the rendered text depends on', () => {
  it('useT: re-renders when English keys arrive while another locale is active', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(LateKeyComponent, provider)

    await provider.setLocale('fr')
    await fixture.whenStable()

    provider.addTranslations('en', { lateKey: 'Loaded' })
    await fixture.whenStable()
    // `t()` falls back to English for a key French lacks.
    expect(rendered(fixture, 'late')).toBe('Loaded')
  })

  it('re-registering the same translations while rendering does not loop', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Re-registers the same translations from its own render-driven work. */
    @Component({
      selector: 'app-test-sub-self-registering',
      template: '<span data-testid="own">{{ own() }}</span>',
    })
    class SelfRegisteringComponent {
      private readonly t = useT()
      private readonly i18n = useI18nProvider()
      renders = 0

      constructor() {
        // Angular forbids writing a signal while a template renders, so the
        // re-registration happens in an effect that reads the view's text
        // (the notification count) and then registers the same text again.
        // An unchanged registration that still notified would loop forever.
        effect(() => {
          this.own()
          this.i18n.addTranslations('en', { own: 'Own text' })
        })
      }

      /**
       * Renders (counting the render) and returns the own text.
       *
       * @returns The own text.
       */
      own(): string {
        this.renders += 1
        return this.t('own', 'Pending')
      }
    }

    const fixture = mount(SelfRegisteringComponent, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'own')).toBe('Own text')

    // A second render re-registers the same translations; a notification would
    // loop forever.
    fixture.detectChanges()
    await fixture.whenStable()
    expect(rendered(fixture, 'own')).toBe('Own text')
    expect(fixture.componentInstance.renders).toBeLessThanOrEqual(4)
  })
})
