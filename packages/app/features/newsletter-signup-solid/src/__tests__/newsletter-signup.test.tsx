// @vitest-environment jsdom
/**
 * Unit tests for the Solid `NewsletterSignup` — a port of
 * `@molecule/app-newsletter-signup-react`'s own suite: the same behavioral
 * assertions, rendered with Solid in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
// `data-button` button and a `data-input` field.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders a {@link NewsletterSignup} and returns the container it rendered into. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('NewsletterSignup', () => {
  it('renders the email input and subscribe button', () => {
    const markup = mount(() => <NewsletterSignup onSubscribe={() => {}} />).innerHTML
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('Subscribe')
  })

  it('renders the default email placeholder and honours a custom one', () => {
    expect(mount(() => <NewsletterSignup onSubscribe={() => {}} />).innerHTML).toContain(
      'placeholder="Your email"',
    )
    const custom = mount(() => (
      <NewsletterSignup onSubscribe={() => {}} placeholder="name@co.com" />
    ))
    expect(custom.innerHTML).toContain('placeholder="name@co.com"')
  })

  it('renders the title and description when present and omits them otherwise', () => {
    const full = mount(() => (
      <NewsletterSignup
        onSubscribe={() => {}}
        title="Stay in the loop"
        description="monthly digest"
      />
    ))
    expect(full.innerHTML).toContain('Stay in the loop')
    expect(full.innerHTML).toContain('monthly digest')
    expect(mount(() => <NewsletterSignup onSubscribe={() => {}} />).innerHTML).not.toContain('<h4')
  })

  it('honours a custom buttonLabel', () => {
    const markup = mount(() => (
      <NewsletterSignup onSubscribe={() => {}} buttonLabel="Join now" />
    )).innerHTML
    expect(markup).toContain('Join now')
    expect(markup).not.toContain('Subscribe')
  })

  it('forwards className onto the form', () => {
    const markup = mount(() => (
      <NewsletterSignup onSubscribe={() => {}} className="ns-cls" />
    )).innerHTML
    expect(markup).toContain('ns-cls')
  })
})
