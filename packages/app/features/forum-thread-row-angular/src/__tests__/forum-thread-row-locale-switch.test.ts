// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `ForumThreadRow`'s counter labels — a port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row-locale-switch.test.tsx`:
 * the same test name and assertion. A static `t` reads the bonded provider but
 * nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels would stay in the old language. `useTranslation()`
 * from `@molecule/app-angular` subscribes, so the component re-renders on the
 * switch. This test bonds a provider with an `en` and a `fr` value for a key
 * the component renders, renders it in `en`, switches to `fr`, and asserts the
 * DOM now shows the French value.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { ForumThreadRow } = await import('../forum-thread-row.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'forumThreadRow.label.replies': '{{count}} replies' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'forumThreadRow.label.replies': '{{count}} réponses' },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = undefined
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ForumThreadRow locale switch', () => {
  it('renders the reply count in French after setLocale', async () => {
    const Host = Component({
      selector: 'mol-locale-host',
      standalone: true,
      imports: [ForumThreadRow],
      changeDetection: ChangeDetectionStrategy.Default,
      template: `<article mol-forum-thread-row title="T" [replyCount]="5"></article>`,
    })(class LocaleHost {})
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection()],
    })
    const ref: ComponentRef<unknown> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    teardown = async () => {
      appRef.destroy()
      host.remove()
    }
    expect(host.textContent).toContain('5 replies')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays '5 replies' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    appRef.tick()

    expect(host.textContent).toContain('5 réponses')
    expect(host.textContent).not.toContain('5 replies')
  })
})
