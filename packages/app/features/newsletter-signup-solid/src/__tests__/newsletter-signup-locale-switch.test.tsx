// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Solid `NewsletterSignup`'s own texts — a
 * port of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-locale-switch.test.tsx`:
 * the same test names and assertions. `useTranslation()` from
 * `@molecule/app-solid` subscribes to the bonded provider, so the form
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * value for the keys the component renders, renders it in `en`, switches to
 * `fr`, and asserts the DOM now shows the French values.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    disabled?: boolean
    type?: JSX.ButtonHTMLAttributes<HTMLButtonElement>['type']
  }) => (
    <button data-button="" type={props.type ?? 'button'} disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Input: (props: { placeholder?: string; required?: boolean; 'aria-label'?: string }) => (
    <input
      data-input=""
      placeholder={props.placeholder}
      required={props.required}
      aria-label={props['aria-label']}
    />
  ),
}))

const { NewsletterSignup } = await import('../NewsletterSignup.jsx')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

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

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Renders a {@link NewsletterSignup} and returns its container. */
function mount(props: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <NewsletterSignup onSubscribe={() => {}} {...props} />, container))
  return container
}

describe('NewsletterSignup locale switch', () => {
  it('renders the email field label in French after setLocale', async () => {
    const container = mount()
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Email')

    await provider.setLocale('fr')

    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Adresse e-mail')
    expect(container.querySelector('input')?.getAttribute('aria-label')).not.toBe('Email')
  })

  it('renders the subscription failure message in French after setLocale', async () => {
    const container = mount({ onSubscribe: () => Promise.reject('nope') })
    await provider.setLocale('fr')
    container
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await Promise.resolve()

    expect(container.querySelector('form')?.textContent).toContain("L'abonnement a échoué")
    expect(container.querySelector('form')?.textContent).not.toContain('Subscription failed')
  })
})
