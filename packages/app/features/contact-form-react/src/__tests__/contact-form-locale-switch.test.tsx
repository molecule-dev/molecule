// @vitest-environment jsdom
/**
 * Locale-switch reactivity for ContactForm's field labels.
 *
 * `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so a component reading `t` from the hook re-renders
 * on the switch. This test bonds a provider with an `en` and a `fr` value for
 * a key the component renders, renders it in `en`, switches to `fr` through
 * `act`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// Class tokens echo their own name; `cn` joins the strings it is given.
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
            : () => String(prop),
      },
    ),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { type: 'submit', disabled }, children),
  Input: (props: Record<string, unknown>) => createElement('input', { ...props }),
  Textarea: (props: Record<string, unknown>) => createElement('textarea', { ...props }),
}))

const { ContactForm } = await import('../ContactForm.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'contactForm.label.name': 'Name' } },
    { code: 'fr', name: 'French', translations: { 'contactForm.label.name': 'Nom' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ContactForm locale switch', () => {
  it('renders the name label in French after setLocale', async () => {
    const { container } = render(createElement(ContactForm, { onSubmit: () => {} }))
    expect(container.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe('Name')

    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe('Nom')
    expect(container.querySelector('input[type="text"]')!.getAttribute('aria-label')).not.toBe(
      'Name',
    )
  })
})
