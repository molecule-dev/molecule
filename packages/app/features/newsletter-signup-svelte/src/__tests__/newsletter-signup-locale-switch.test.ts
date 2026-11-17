// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte `NewsletterSignup`'s own texts — a
 * port of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-locale-switch.test.tsx`:
 * the same test names and assertions. `useTranslation()` from
 * `@molecule/app-svelte` subscribes to the bonded provider, so the form
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * value for the keys the component renders, renders it in `en`, switches to
 * `fr`, and asserts the DOM now shows the French values.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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

import NewsletterSignup from '../NewsletterSignup.svelte'
import type { NewsletterSignupProps } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted instance, torn down after each test. */
let instance: ReturnType<typeof mount> | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: {
        'newsletter.label.email': 'Email',
        'newsletter.error.subscriptionFailed': 'Subscription failed',
      },
    },
    {
      code: 'fr',
      name: 'French',
      translations: {
        'newsletter.label.email': 'Adresse e-mail',
        'newsletter.error.subscriptionFailed': "L'abonnement a échoué",
      },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts `NewsletterSignup` with the given props.
 *
 * @param props - The component props; `onSubscribe` defaults to a no-op when omitted.
 * @returns The target element the form rendered into.
 */
function render(props: Partial<NewsletterSignupProps> = {}): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const fullProps: NewsletterSignupProps = { onSubscribe: () => {}, ...props }
  instance = mount(NewsletterSignup, { target, props: fullProps })
  flushSync()
  return target
}

describe('NewsletterSignup locale switch', () => {
  it('renders the email field label in French after setLocale', async () => {
    const target = render()
    expect(target.querySelector('input')?.getAttribute('aria-label')).toBe('Email')

    await provider.setLocale('fr')
    flushSync()

    expect(target.querySelector('input')?.getAttribute('aria-label')).toBe('Adresse e-mail')
    expect(target.querySelector('input')?.getAttribute('aria-label')).not.toBe('Email')
  })

  it('renders the subscription failure message in French after setLocale', async () => {
    const target = render({ onSubscribe: () => Promise.reject('nope') })
    await provider.setLocale('fr')
    flushSync()
    target
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await Promise.resolve()
    flushSync()

    expect(target.querySelector('form')?.textContent).toContain("L'abonnement a échoué")
    expect(target.querySelector('form')?.textContent).not.toContain('Subscription failed')
  })
})
