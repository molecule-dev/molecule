// @vitest-environment jsdom

/**
 * Angular port of React's `useTranslation.body-runs.test.tsx`: one locale
 * switch or `addTranslations` renders once, `t` follows the locale (a new
 * identity on a switch, kept on an in-place add) and `locales` follows every
 * notification. Angular calls the function once and re-evaluates the template
 * on a signal change, so a "body run" is one render of the mounted view.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection, signal } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { provideI18n } from '../../providers.js'
import { useTranslation } from '../use-translation.js'

const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

/** What one render of the view saw. */
interface BodyRun {
  /** The translation function identity that render held. */
  t: unknown
  /** The locales list that render read. */
  locales: unknown
  /** The text that render produced. */
  text: string
}

/** Records one `BodyRun` on every render. */
@Component({
  selector: 'app-test-body-runs',
  template: '<span data-testid="text">{{ render() }}</span><span>{{ nonce() }}</span>',
})
class BodyRunsComponent {
  private readonly i18n = useTranslation()
  readonly runs: BodyRun[] = []
  // A local signal the view reads: its change re-renders with no provider
  // change, Angular's counterpart of React's `count` prop.
  readonly nonce = signal(0)

  /**
   * Records one render and returns the greeting.
   *
   * @returns The translated greeting.
   */
  render(): string {
    const text = this.i18n.t('greeting')
    this.runs.push({ t: this.i18n.t, locales: this.i18n.locales(), text })
    return text
  }
}

/**
 * Mounts the recorder under one provider and returns its recorded runs.
 *
 * @param provider - The i18n provider to read.
 * @returns The mounted fixture and its recorded runs.
 */
function mountRecorder(provider: I18nProvider): {
  fixture: ComponentFixture<BodyRunsComponent>
  runs: BodyRun[]
} {
  TestBed.configureTestingModule({
    imports: [BodyRunsComponent],
    providers: [provideZonelessChangeDetection(), provideI18n(provider)],
  })
  const fixture = TestBed.createComponent(BodyRunsComponent)
  fixture.detectChanges()
  return { fixture, runs: fixture.componentInstance.runs }
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

describe('useTranslation body runs', () => {
  it('runs the body once per locale switch, with a new t and a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { fixture, runs } = mountRecorder(provider)
    expect(runs).toHaveLength(1)
    const [mounted] = runs

    await provider.setLocale('fr')
    await fixture.whenStable()

    expect(
      (fixture.nativeElement.querySelector('[data-testid="text"]') as HTMLElement | null)
        ?.textContent,
    ).toBe('Bonjour')
    expect(runs).toHaveLength(2)
    expect(runs[1].text).toBe('Bonjour')
    expect(runs[1].t).not.toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('runs the body once per addTranslations, keeping t and taking a new locales list', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { fixture, runs } = mountRecorder(provider)
    const [mounted] = runs

    provider.addTranslations('en', { greeting: 'Hi' })
    await fixture.whenStable()

    expect(
      (fixture.nativeElement.querySelector('[data-testid="text"]') as HTMLElement | null)
        ?.textContent,
    ).toBe('Hi')
    expect(runs).toHaveLength(2)
    expect(runs[1].text).toBe('Hi')
    expect(runs[1].t).toBe(mounted.t)
    expect(runs[1].locales).not.toBe(mounted.locales)
  })

  it('keeps t and locales across a re-render with no provider change', () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    const { fixture, runs } = mountRecorder(provider)

    fixture.componentInstance.nonce.set(1)
    fixture.detectChanges()

    expect(runs).toHaveLength(2)
    expect(runs[1].t).toBe(runs[0].t)
    expect(runs[1].locales).toBe(runs[0].locales)
  })
})
