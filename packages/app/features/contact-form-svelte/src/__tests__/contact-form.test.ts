// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ContactForm` — a port of
 * `@molecule/app-contact-form-react`'s own suite: the same behavioral
 * assertions, rendered with a real Svelte mount (jsdom) and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { createRawSnippet, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React suite uses.
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The real `@molecule/app-ui-svelte` Input/Textarea/Button render against the
// mocked ClassMap and translations above — the same observable markup the React
// suite's UI mocks produce (`aria-label`, placeholder, button text).

import ContactForm from '../ContactForm.svelte'
import type { ContactFormProps } from '../types.js'

interface Mounted {
  component: ReturnType<typeof mount<ContactFormProps, Record<string, never>>>
  target: HTMLElement
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const { component, target } of mounted.splice(0)) {
    void unmount(component)
    target.remove()
  }
})

/**
 * Mounts `ContactForm` with the given props.
 *
 * @param props - The component props, beyond the required `onSubmit`.
 * @returns The mounted instance and its target element.
 */
function render(props: Omit<Partial<ContactFormProps>, 'onSubmit'> = {}): Mounted {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const fullProps: ContactFormProps = { onSubmit: () => {}, ...props }
  const component = mount(ContactForm, { target, props: fullProps })
  const entry = { component, target }
  mounted.push(entry)
  return entry
}

describe('ContactForm', () => {
  it('renders the name, email, and message fields', () => {
    const markup = render().target.innerHTML
    expect(markup).toContain('aria-label="Name"')
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('aria-label="Message"')
  })

  it('renders the title and description when present and omits the header otherwise', () => {
    const withHeader = render({ title: 'Contact us', description: 'we reply fast' }).target
      .innerHTML
    expect(withHeader).toContain('Contact us')
    expect(withHeader).toContain('we reply fast')
    expect(render().target.innerHTML).not.toContain('<header')
  })

  it('renders the default submit label', () => {
    expect(render().target.innerHTML).toContain('Send message')
  })

  it('honours a custom submitLabel', () => {
    const markup = render({ submitLabel: 'Get in touch' }).target.innerHTML
    expect(markup).toContain('Get in touch')
    expect(markup).not.toContain('Send message')
  })

  it('renders the extraFields slot', () => {
    const extraFields = createRawSnippet(() => ({ render: () => '<input data-extra="" />' }))
    const markup = render({ extraFields }).target.innerHTML
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the form', () => {
    expect(render({ className: 'cf-cls' }).target.innerHTML).toContain('cf-cls')
  })
})
