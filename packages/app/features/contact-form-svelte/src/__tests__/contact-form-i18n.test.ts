// @vitest-environment jsdom
/**
 * Every string the Svelte `ContactForm` writes itself goes through i18n — a
 * port of `@molecule/app-contact-form-react/src/__tests__/contact-form-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The real `@molecule/app-ui-svelte` Input/Textarea/Button render against the
// mocked ClassMap and translations above — the same observable markup the
// React suite's UI mocks produce (`aria-label`, placeholder, button text).

import ContactForm from '../ContactForm.svelte'
import type { ContactFormProps } from '../types.js'

interface Mounted {
  /**
   * The handle `unmount` takes back. Svelte's wildcard `*.svelte` module
   * declaration types a component as `LegacyComponentType`, so `mount()`
   * resolves its export object to the legacy instance shape
   * (`{ $on?, $set? } & Record<string, any>`), not `Record<string, never>`.
   */
  component: ReturnType<typeof mount<ContactFormProps, Record<string, unknown>>>
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
 * @param props - The component props; `onSubmit` defaults to a noop when omitted.
 * @returns The mounted instance and its target element.
 */
function render(props: Partial<ContactFormProps> = {}): Mounted {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const fullProps: ContactFormProps = { ...props, onSubmit: props.onSubmit ?? (() => {}) }
  const component = mount(ContactForm, { target, props: fullProps })
  const entry = { component, target }
  mounted.push(entry)
  return entry
}

describe('ContactForm i18n', () => {
  it('takes the field labels through i18n by default', () => {
    const { target } = render()
    expect(target.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.name»',
    )
    expect(target.querySelector('input[type="email"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.email»',
    )
    expect(target.querySelector('textarea')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.message»',
    )
  })

  it('takes the non-Error submit fallback through i18n by default', async () => {
    // The fallback renders only when `onSubmit` throws something that is not
    // an `Error` (a rejected `Error` shows its own `.message` verbatim).
    const { target } = render({ onSubmit: () => Promise.reject('boom') })
    target
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(target.querySelector('form')?.textContent).toContain(
      '«contactForm.error.submissionFailed»',
    )
  })
})
