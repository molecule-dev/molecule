// @vitest-environment jsdom
/**
 * The Solid `NewsletterSignup`'s own text goes through i18n — a port of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. With a
 * provider whose `t` marks every key (`«key»`), the email field's label and the
 * non-`Error` failure message render their key, and an explicit `placeholder`
 * prop still overrides the default.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// the same mock the React suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

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
  document.body.innerHTML = ''
})

/** Renders a {@link NewsletterSignup} and returns its container. */
function mount(props: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <NewsletterSignup onSubscribe={() => {}} {...props} />, container))
  return container
}

/** Submits the form once and lets the async handler settle. */
async function submit(container: HTMLElement): Promise<void> {
  container
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await Promise.resolve()
  await Promise.resolve()
}

describe('NewsletterSignup text', () => {
  it('takes the email field label through i18n by default', () => {
    expect(mount().querySelector('input')?.getAttribute('aria-label')).toBe(
      '«newsletter.label.email»',
    )
  })

  it('takes the subscription failure message through i18n by default', async () => {
    // A non-`Error` rejection is where the component supplies its own message.
    const container = mount({ onSubscribe: () => Promise.reject('nope') })
    await submit(container)
    expect(container.querySelector('form')?.textContent).toContain(
      '«newsletter.error.subscriptionFailed»',
    )
  })

  it('keeps an explicit placeholder over the translated default', () => {
    expect(
      mount({ placeholder: 'name@co.com' }).querySelector('input')?.getAttribute('placeholder'),
    ).toBe('name@co.com')
  })
})
