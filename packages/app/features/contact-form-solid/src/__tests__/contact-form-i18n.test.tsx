// @vitest-environment jsdom
/**
 * Every string the Solid `ContactForm` writes itself goes through i18n — a
 * port of `@molecule/app-contact-form-react/src/__tests__/contact-form-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with, carrying
// the type, placeholder and aria-label through to the native element.
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

const { ContactForm } = await import('../ContactForm.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders a {@link ContactForm} and returns the container it rendered into. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('ContactForm i18n', () => {
  it('takes the field labels through i18n by default', () => {
    const container = mount(() => <ContactForm onSubmit={() => {}} />)
    expect(container.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.name»',
    )
    expect(container.querySelector('input[type="email"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.email»',
    )
    expect(container.querySelector('textarea')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.message»',
    )
  })

  it('takes the non-Error submit fallback through i18n by default', async () => {
    // The fallback renders only when `onSubmit` throws something that is not
    // an `Error` (a rejected `Error` shows its own `.message` verbatim).
    const container = mount(() => <ContactForm onSubmit={() => Promise.reject('boom')} />)
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(container.querySelector('form')?.textContent).toContain(
      '«contactForm.error.submissionFailed»',
    )
  })
})
