// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `NewsletterSignup` — a port of
 * `@molecule/app-newsletter-signup-react`'s own suite: the same behavioral
 * assertions, rendered with a real Svelte mount (jsdom) and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The real `@molecule/app-ui-svelte` Input/Button render against the mocked
// ClassMap and translations above — the same observable markup the React
// suite's UI mocks produce (`aria-label`, placeholder, button text).

import NewsletterSignup from '../NewsletterSignup.svelte'
import type { NewsletterSignupProps } from '../types.js'

interface Mounted {
  component: ReturnType<typeof mount>
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
 * Mounts `NewsletterSignup` with the given props.
 *
 * @param props - The component props; `onSubscribe` defaults to a no-op when omitted.
 * @returns The mounted instance and its target element.
 */
function render(props: Partial<NewsletterSignupProps> = {}): Mounted {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const fullProps: NewsletterSignupProps = { onSubscribe: () => {}, ...props }
  const component = mount(NewsletterSignup, { target, props: fullProps })
  const entry = { component, target }
  mounted.push(entry)
  return entry
}

describe('NewsletterSignup', () => {
  it('renders the email input and subscribe button', () => {
    const markup = render().target.innerHTML
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('Subscribe')
  })

  it('renders the default email placeholder and honours a custom one', () => {
    expect(render().target.innerHTML).toContain('placeholder="Your email"')
    expect(render({ placeholder: 'name@co.com' }).target.innerHTML).toContain(
      'placeholder="name@co.com"',
    )
  })

  it('renders the title and description when present and omits them otherwise', () => {
    const full = render({ title: 'Stay in the loop', description: 'monthly digest' }).target
      .innerHTML
    expect(full).toContain('Stay in the loop')
    expect(full).toContain('monthly digest')
    expect(render().target.innerHTML).not.toContain('<h4')
  })

  it('honours a custom buttonLabel', () => {
    const markup = render({ buttonLabel: 'Join now' }).target.innerHTML
    expect(markup).toContain('Join now')
    expect(markup).not.toContain('Subscribe')
  })

  it('forwards className onto the form', () => {
    expect(render({ className: 'ns-cls' }).target.innerHTML).toContain('ns-cls')
  })
})
