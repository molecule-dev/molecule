// @vitest-environment jsdom
/**
 * Locale-switch reactivity for NewsletterSignup's own texts.
 *
 * `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so the form re-renders on a locale change. This test
 * bonds a provider with an `en` and a `fr` value for the keys the component
 * renders, renders it in `en`, switches to `fr` through `act`, and asserts the
 * DOM now shows the French values.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : (..._args: unknown[]) => String(prop),
      },
    ),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: React.ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Input: ({
    placeholder,
    ['aria-label']: ariaLabel,
  }: {
    placeholder?: string
    'aria-label'?: string
  }) => createElement('input', { 'data-input': '', placeholder, 'aria-label': ariaLabel }),
}))

const { NewsletterSignup } = await import('../NewsletterSignup.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
let root: Root | null = null
let host: HTMLElement | null = null

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
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts the form in jsdom.
 *
 * @param props - Props over a no-op `onSubscribe`.
 * @returns The container the form rendered into.
 */
async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(NewsletterSignup, { onSubscribe: () => {}, ...props }))
  })
  return host
}

describe('NewsletterSignup locale switch', () => {
  it('renders the email field label in French after setLocale', async () => {
    const container = await mount()
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Email')

    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Adresse e-mail')
  })

  it('renders the subscription failure message in French after setLocale', async () => {
    const container = await mount({ onSubscribe: () => Promise.reject('nope') })
    await act(async () => {
      await provider.setLocale('fr')
    })
    await act(async () => {
      container
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    expect(container.querySelector('form')?.textContent).toContain("L'abonnement a échoué")
  })
})
