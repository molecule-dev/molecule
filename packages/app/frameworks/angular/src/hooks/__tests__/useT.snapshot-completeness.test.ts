// @vitest-environment jsdom

/**
 * Angular port of React's `useT.snapshot-completeness.test.tsx`: a change
 * announced while a consumer cannot hear it is still observed. React's window
 * is a layout-effect subscription; Angular subscribes in the component's field
 * initializer, so its nearest equivalents are a later sibling created after an
 * earlier sibling's `ngOnInit`, and a view destroyed and re-created by `@if`
 * (React's hidden `<Activity>`). Every title is React's; only the
 * framework-forced mechanics change.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type OnInit,
  provideZonelessChangeDetection,
  signal,
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

/** Registers translations from its mount hook: React's layout effect. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-snap-add-in-layout',
  template: '',
})
class AddInLayoutComponent implements OnInit {
  private readonly i18n = useI18nProvider()

  ngOnInit(): void {
    this.i18n.addTranslations('en', LATE)
  }
}

/** Registers translations from its mount hook (`ngOnInit`, Angular's only one). */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-snap-add-in-effect',
  template: '',
})
class AddInEffectComponent implements OnInit {
  private readonly i18n = useI18nProvider()

  ngOnInit(): void {
    this.i18n.addTranslations('en', LATE)
  }
}

/** Reads the greeting through `useT()`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-snap-greeting',
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
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-snap-late',
  template: '<span data-testid="late">{{ late() }}</span>',
})
class LateTextComponent {
  private readonly t = useT()

  /**
   * The late key's text.
   *
   * @returns The translated text or its fallback.
   */
  late(): string {
    return this.t('late', 'Pending')
  }
}

/** Reads the locale, direction and two texts together. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-snap-detail',
  template: '<span data-testid="detail">{{ detail() }}</span>',
})
class DetailComponent {
  private readonly i18n = useTranslation()

  /**
   * The locale, direction and both texts the view renders.
   *
   * @returns The rendered line.
   */
  detail(): string {
    return `${this.i18n.locale()}/${this.i18n.direction()}:${this.i18n.t('greeting', undefined, {
      defaultValue: 'Hello',
    })}|${this.i18n.t('late', undefined, { defaultValue: 'Pending' })}`
  }
}

/** Holds the detail view behind `@if`, so hiding unmounts its effects. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-snap-hidden-host',
  imports: [DetailComponent],
  template: '@if (visible()) { <app-test-snap-detail /> }',
})
class HiddenHostComponent {
  readonly visible = signal(true)
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

describe("a same-locale add in a child's layout effect", () => {
  it('useT: the parent renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Reads the key its child registers from the child's mount hook. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-parent-shell',
      imports: [AddInLayoutComponent],
      template: '<span data-testid="shell">{{ shell() }}</span><app-test-snap-add-in-layout />',
    })
    class ParentShellComponent {
      private readonly t = useT()

      /**
       * The late key's text.
       *
       * @returns The translated text or its fallback.
       */
      shell(): string {
        return this.t('late', 'Pending')
      }
    }

    const fixture = mount(ParentShellComponent, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'shell')).toBe('Loaded')
  })

  it('useTranslation: the parent renders the added text with the current locale/direction', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Reads locale, direction and the key its child registers. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-translation-shell',
      imports: [AddInLayoutComponent],
      template: '<span data-testid="shell">{{ shell() }}</span><app-test-snap-add-in-layout />',
    })
    class TranslationShellComponent {
      private readonly i18n = useTranslation()

      /**
       * The locale, direction and late text.
       *
       * @returns The rendered line.
       */
      shell(): string {
        return `${this.i18n.locale()}/${this.i18n.direction()}:${this.i18n.t('late', undefined, {
          defaultValue: 'Pending',
        })}`
      }
    }

    const fixture = mount(TranslationShellComponent, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'shell')).toBe('en/ltr:Loaded')
  })
})

describe("a same-locale add in an earlier sibling's layout effect", () => {
  it('useT: the later sibling renders the added text', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** The registrar, then the reader. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-late-sibling-host',
      imports: [AddInLayoutComponent, LateTextComponent],
      template: '<app-test-snap-add-in-layout /><app-test-snap-late />',
    })
    class LateSiblingHost {}

    const fixture = mount(LateSiblingHost, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'late')).toBe('Loaded')
  })

  it('useTranslation: the later sibling renders text and locale together', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** The registrar, then the detail reader. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-detail-sibling-host',
      imports: [AddInLayoutComponent, DetailComponent],
      template: '<app-test-snap-add-in-layout /><app-test-snap-detail />',
    })
    class DetailSiblingHost {}

    const fixture = mount(DetailSiblingHost, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'detail')).toBe('en/ltr:Hello|Loaded')
  })
})

describe('a same-locale change while the view is hidden', () => {
  it('useT: effects are unmounted while hidden and the text updates on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const live = trackSubscriptions(provider)

    const fixture = mount(HiddenHostComponent, provider)
    expect(rendered(fixture, 'detail')).toBe('en/ltr:Hello|Pending')
    expect(live()).toBe(1)

    // The premise of the case: hiding the view unmounts its effects, so no
    // listener exists while it is hidden.
    fixture.componentInstance.visible.set(false)
    fixture.detectChanges()
    expect(live()).toBe(0)

    provider.addTranslations('en', LATE)

    fixture.componentInstance.visible.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(rendered(fixture, 'detail')).toBe('en/ltr:Hello|Loaded')
  })

  it('useTranslation: a locale switch while hidden is shown on reveal', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(HiddenHostComponent, provider)
    fixture.componentInstance.visible.set(false)
    fixture.detectChanges()

    await provider.setLocale('fr')

    fixture.componentInstance.visible.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(rendered(fixture, 'detail')).toBe('fr/ltr:Bonjour|Pending')
  })
})

describe('a locale switch before the listener exists', () => {
  it("useT: a child's layout-effect switch is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Switches the locale while the parent's first render is in flight. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-switch-in-layout',
      template: '',
    })
    class SwitchInLayoutComponent implements OnInit {
      private readonly i18n = useI18nProvider()

      ngOnInit(): void {
        void this.i18n.setLocale('fr')
      }
    }

    /** Reads the greeting its child switched. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-switch-shell',
      imports: [SwitchInLayoutComponent],
      template: '<span data-testid="shell">{{ shell() }}</span><app-test-snap-switch-in-layout />',
    })
    class SwitchShellComponent {
      private readonly t = useT()

      /**
       * The greeting the view renders.
       *
       * @returns The translated greeting.
       */
      shell(): string {
        return this.t('greeting', 'Hello')
      }
    }

    const fixture = mount(SwitchShellComponent, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'shell')).toBe('Bonjour')
  })
})

describe('ordinary effects and notifications stay green', () => {
  it("useT: an add from the reader's own mount effect is shown", async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Reads the key its child registers. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-effect-shell',
      imports: [AddInEffectComponent],
      template: '<span data-testid="shell">{{ shell() }}</span><app-test-snap-add-in-effect />',
    })
    class EffectShellComponent {
      private readonly t = useT()

      /**
       * The late key's text.
       *
       * @returns The translated text or its fallback.
       */
      shell(): string {
        return this.t('late', 'Pending')
      }
    }

    const fixture = mount(EffectShellComponent, provider)
    await fixture.whenStable()
    expect(rendered(fixture, 'shell')).toBe('Loaded')
  })

  it('useT: a later add while mounted re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(LateTextComponent, provider)
    provider.addTranslations('en', LATE)
    await fixture.whenStable()
    expect(rendered(fixture, 'late')).toBe('Loaded')
  })

  it('useT: an English fallback added while French is active re-renders', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    const fixture = mount(LateTextComponent, provider)
    await provider.setLocale('fr')
    await fixture.whenStable()

    provider.addTranslations('en', LATE)
    await fixture.whenStable()
    expect(rendered(fixture, 'late')).toBe('Loaded')
  })

  it('useT: an unchanged re-registration while rendering does not loop', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Re-registers the same translations on every render-driven pass. */
    @Component({
      // Counts renders as a port component (checked as OnPush) renders, as React counts them.
      changeDetection: ChangeDetectionStrategy.OnPush,
      selector: 'app-test-snap-self-registering',
      template: '<span data-testid="own">{{ own() }}</span>',
    })
    class SelfRegisteringComponent {
      private readonly t = useT()
      private readonly i18n = useI18nProvider()
      renders = 0

      constructor() {
        // Angular forbids writing a signal while a template renders, so the
        // re-registration happens in an effect that reads the view's text (the
        // notification count) and registers the same text again. An unchanged
        // registration that still notified would loop forever.
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

describe('identity, lifecycle and provider replacement', () => {
  it('useT: one callback identity across re-renders and a locale change, one effect run', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)

    /** Records the identity on each render and runs one identity-bound effect. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'app-test-snap-identity',
      template: '<span data-testid="text">{{ text() }}</span>',
    })
    class IdentityComponent {
      readonly t = useT()
      readonly seen: unknown[] = []
      effectRuns = 0

      constructor() {
        effect(() => {
          this.seen.push(this.t)
          this.effectRuns += 1
        })
      }

      /**
       * Records this render's identity and returns the greeting.
       *
       * @returns The translated greeting.
       */
      text(): string {
        this.seen.push(this.t)
        return this.t('greeting', 'Hello')
      }
    }

    const fixture = mount(IdentityComponent, provider)
    await fixture.whenStable()
    const { seen } = fixture.componentInstance
    const first = seen[0]

    await provider.setLocale('fr')
    await fixture.whenStable()
    expect(new Set(seen).size).toBe(1)
    expect(seen[0]).toBe(first)
    expect(fixture.componentInstance.effectRuns).toBe(1)
    expect(rendered(fixture, 'text')).toBe('Bonjour')
  })

  it('useT: one live subscription under StrictMode and none after unmount', async () => {
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

  it('useT: replacing the provider in place moves the subscription and updates text', async () => {
    const providerA = createSimpleI18nProvider('en', LOCALES)
    const providerB = createSimpleI18nProvider('fr', LOCALES)
    const liveA = trackSubscriptions(providerA)
    const liveB = trackSubscriptions(providerB)

    const fixtureA = mount(GreetingComponent, providerA)
    expect(liveA()).toBe(1)
    fixtureA.destroy()

    // Angular's injector token is immutable, so the provider is replaced by a
    // fresh module behind the same component.
    TestBed.resetTestingModule()
    const fixtureB = mount(GreetingComponent, providerB)
    expect([liveA(), liveB()]).toEqual([0, 1])
    expect(rendered(fixtureB, 'text')).toBe('Bonjour')

    providerB.addTranslations('fr', { greeting: 'Salut' })
    fixtureB.detectChanges()
    expect(rendered(fixtureB, 'text')).toBe('Salut')
  })

  it('useT: a provider without getRevision still re-renders on ordinary notifications', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    // A provider written before the revision method existed: the hook must fall
    // back to counting notifications, exactly as it did on the accepted tree.
    Reflect.deleteProperty(provider, 'getRevision')

    const fixture = mount(LateTextComponent, provider)
    provider.addTranslations('en', LATE)
    await fixture.whenStable()
    expect(rendered(fixture, 'late')).toBe('Loaded')
  })
})
