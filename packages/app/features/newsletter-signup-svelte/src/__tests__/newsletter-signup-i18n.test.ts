// @vitest-environment jsdom
/**
 * The Svelte `NewsletterSignup`'s own text goes through i18n — a port of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount (jsdom).
 * With a provider whose `t` marks every key (`«key»`), the email field's label
 * and the non-`Error` failure message render their key, and an explicit
 * `placeholder` prop still overrides the default.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// the same mock the React suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

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
  flushSync()
  const entry = { component, target }
  mounted.push(entry)
  return entry
}

/** Submits the form once and lets the async handler settle. */
async function submit(target: HTMLElement): Promise<void> {
  target
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await Promise.resolve()
  await Promise.resolve()
  flushSync()
}

describe('NewsletterSignup text', () => {
  it('takes the email field label through i18n by default', () => {
    expect(render().target.querySelector('input')?.getAttribute('aria-label')).toBe(
      '«newsletter.label.email»',
    )
  })

  it('takes the subscription failure message through i18n by default', async () => {
    // A non-`Error` rejection is where the component supplies its own message.
    const { target } = render({ onSubscribe: () => Promise.reject('nope') })
    await submit(target)
    expect(target.querySelector('form')?.textContent).toContain(
      '«newsletter.error.subscriptionFailed»',
    )
  })

  it('keeps an explicit placeholder over the translated default', () => {
    expect(
      render({ placeholder: 'name@co.com' })
        .target.querySelector('input')
        ?.getAttribute('placeholder'),
    ).toBe('name@co.com')
  })
})
