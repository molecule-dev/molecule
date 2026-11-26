// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ContactForm` — a port of
 * `@molecule/app-contact-form-react`'s own suite: the same behavioral
 * assertions, rendered with Solid in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ButtonElementProps } from '@molecule/app-ui'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React suite uses.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button, a `data-input` field and a `data-textarea` field.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
  Input: (props: { 'aria-label'?: string }) => (
    <input data-input="" aria-label={props['aria-label']} />
  ),
  Textarea: (props: { 'aria-label'?: string }) => (
    <textarea data-textarea="" aria-label={props['aria-label']} />
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

describe('ContactForm', () => {
  it('renders the name, email, and message fields', () => {
    const markup = mount(() => <ContactForm onSubmit={() => {}} />).innerHTML
    expect(markup).toContain('aria-label="Name"')
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('aria-label="Message"')
  })

  it('renders the title and description when present and omits the header otherwise', () => {
    const withHeader = mount(() => (
      <ContactForm onSubmit={() => {}} title="Contact us" description="we reply fast" />
    ))
    expect(withHeader.innerHTML).toContain('Contact us')
    expect(withHeader.innerHTML).toContain('we reply fast')
    const without = mount(() => <ContactForm onSubmit={() => {}} />)
    expect(without.innerHTML).not.toContain('<header')
  })

  it('renders the default submit label', () => {
    const markup = mount(() => <ContactForm onSubmit={() => {}} />).innerHTML
    expect(markup).toContain('Send message')
  })

  it('honours a custom submitLabel', () => {
    const markup = mount(() => (
      <ContactForm onSubmit={() => {}} submitLabel="Get in touch" />
    )).innerHTML
    expect(markup).toContain('Get in touch')
    expect(markup).not.toContain('Send message')
  })

  it('renders the extraFields slot', () => {
    const markup = mount(() => (
      <ContactForm onSubmit={() => {}} extraFields={<input data-extra="" />} />
    )).innerHTML
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the form', () => {
    const markup = mount(() => <ContactForm onSubmit={() => {}} className="cf-cls" />).innerHTML
    expect(markup).toContain('cf-cls')
  })
})
