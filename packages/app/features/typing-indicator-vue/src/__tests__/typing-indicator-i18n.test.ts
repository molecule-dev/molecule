// @vitest-environment jsdom
/**
 * The default aria-label goes through i18n — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. The label was
 * a prop default (`'Typing…'`), so it rendered plain English in every locale;
 * these tests mock `useTranslation` with a `t` that marks every key, so a
 * default that bypassed `t()` would show up as plain English.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the Vue suite uses. The real module is spread in, so
// `DEFAULT_TYPING_PULSE` is the real value.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'typingPulse') return undefined
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { createApp, defineComponent, h } from 'vue'

import { TypingIndicator } from '../TypingIndicator.js'

const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
})

/**
 * Renders a {@link TypingIndicator} and returns the markup it produced.
 *
 * @param props - The indicator props.
 * @returns The host element.
 */
function render(props: Record<string, unknown>): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TypingIndicator, props) }))
  app.mount(host)
  mounted.push(() => {
    app.unmount()
    host.remove()
  })
  return host
}

describe('TypingIndicator i18n', () => {
  it('renders the default aria-label through t', () => {
    const host = render({})
    const status = host.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('«typingIndicator.aria.label»')
  })

  it('an explicit ariaLabel overrides the translated label', () => {
    const host = render({ ariaLabel: 'Alice is typing' })
    const status = host.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Alice is typing')
  })
})
