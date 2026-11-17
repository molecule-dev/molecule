// @vitest-environment jsdom
/**
 * The component's own text goes through i18n: with a provider whose `t` marks
 * every key (`«key»`), the email field's label and the non-`Error` failure
 * message render their key, and an explicit `placeholder` prop still overrides
 * the default. A default that bypassed `t()` would show up as plain English —
 * exactly what the conformance kit's `en-XA` check flags.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { NewsletterSignup } = await import('../NewsletterSignup.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
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

/** Submits the form once and lets the async handler settle. */
async function submit(container: HTMLElement): Promise<void> {
  await act(async () => {
    container
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
  })
}

describe('NewsletterSignup text', () => {
  it('takes the email field label through i18n by default', async () => {
    const container = await mount()
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe(
      '«newsletter.label.email»',
    )
  })

  it('takes the subscription failure message through i18n by default', async () => {
    // A non-`Error` rejection is where the component supplies its own message.
    const container = await mount({ onSubscribe: () => Promise.reject('nope') })
    await submit(container)
    expect(container.querySelector('form')?.textContent).toContain(
      '«newsletter.error.subscriptionFailed»',
    )
  })

  it('keeps an explicit placeholder over the translated default', async () => {
    const container = await mount({ placeholder: 'name@co.com' })
    expect(container.querySelector('input')?.getAttribute('placeholder')).toBe('name@co.com')
  })
})
