// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Solid `ContactForm`'s field labels — a
 * port of `@molecule/app-contact-form-react/src/__tests__/contact-form-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-solid` reads the provider reactively, so the component's
 * translated attributes re-run on the switch. This test bonds a provider with
 * an `en` and a `fr` value for a key the component renders, renders it in
 * `en`, switches to `fr`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ButtonElementProps } from '@molecule/app-ui'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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
    // The real `ButtonProps` contract's `type` union — the component calls
    // with `"submit"`, and a bare `string` would widen it past the native
    // `<button type>` attribute's allowed values.
    type?: ButtonElementProps['type']
  }) => (
    <button data-button="" type={props.type ?? 'button'} disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Input: (props: {
    'aria-label'?: string
    placeholder?: string
    required?: boolean
    type?: string
  }) => (
    <input
      data-input=""
      type={props.type}
      placeholder={props.placeholder}
      required={props.required}
      aria-label={props['aria-label']}
    />
  ),
  Textarea: (props: {
    'aria-label'?: string
    placeholder?: string
    required?: boolean
    rows?: number
  }) => (
    <textarea
      data-textarea=""
      placeholder={props.placeholder}
      required={props.required}
      rows={props.rows}
      aria-label={props['aria-label']}
    />
  ),
}))

import { ContactForm } from '../ContactForm.jsx'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'contactForm.label.name': 'Name' } },
    { code: 'fr', name: 'French', translations: { 'contactForm.label.name': 'Nom' } },
  ])
  setProvider(provider)
})

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Renders a {@link ContactForm} and returns the container it rendered into. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('ContactForm locale switch', () => {
  it('renders the name label in French after setLocale', async () => {
    const container = mount(() => <ContactForm onSubmit={() => {}} />)
    const field = () => container.querySelector('input[type="text"]')!
    expect(field().getAttribute('aria-label')).toBe('Name')

    // The switch itself: the component must re-render in French.
    await provider.setLocale('fr')

    expect(field().getAttribute('aria-label')).toBe('Nom')
  })
})
