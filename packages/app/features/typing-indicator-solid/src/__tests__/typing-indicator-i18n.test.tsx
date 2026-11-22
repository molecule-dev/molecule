// @vitest-environment jsdom
/**
 * The default aria-label goes through i18n — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. The label
 * was a literal fallback (`props.ariaLabel ?? 'Typing…'`), so it rendered plain
 * English in every locale; these tests mock `useTranslation` with a `t` that
 * marks every key, so a default that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TypingIndicatorProps } from '../types.js'

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the Solid suite uses.
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { TypingIndicator } = await import('../TypingIndicator.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a {@link TypingIndicator} with Solid's browser renderer.
 *
 * @param props - The indicator props.
 * @returns The container element.
 */
function mount(props: TypingIndicatorProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <TypingIndicator {...props} />, container))
  return container
}

describe('TypingIndicator i18n', () => {
  it('renders the default aria-label through t', () => {
    const container = mount({})
    const status = container.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('«typingIndicator.aria.label»')
  })

  it('an explicit ariaLabel overrides the translated label', () => {
    const container = mount({ ariaLabel: 'Alice is typing' })
    const status = container.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Alice is typing')
  })
})
