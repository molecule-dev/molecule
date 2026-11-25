// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte `ContactForm`'s field labels — a
 * port of `@molecule/app-contact-form-react/src/__tests__/contact-form-locale-switch.test.tsx`:
 * the same test name and assertion. The component reads `t` inside `$derived`
 * values, which re-run when the provider changes, so a switch re-renders the
 * text. This test bonds a provider with an `en` and a `fr` value for a key the
 * component renders, renders it in `en`, switches to `fr`, and asserts the DOM
 * now shows the French value.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
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

// The real `@molecule/app-ui-svelte` Input/Textarea/Button render against the
// mocked ClassMap above and the bonded i18n provider below.

import ContactForm from '../ContactForm.svelte'
import type { ContactFormProps } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'contactForm.label.name': 'Name' } },
    { code: 'fr', name: 'French', translations: { 'contactForm.label.name': 'Nom' } },
  ])
  setProvider(provider)
})

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
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
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

describe('ContactForm locale switch', () => {
  it('renders the name label in French after setLocale', async () => {
    const { target } = render()
    const field = () => target.querySelector('input[type="text"]')!
    expect(field().getAttribute('aria-label')).toBe('Name')

    // The switch itself: the component must re-render in French.
    await provider.setLocale('fr')

    expect(field().getAttribute('aria-label')).toBe('Nom')
  })
})
