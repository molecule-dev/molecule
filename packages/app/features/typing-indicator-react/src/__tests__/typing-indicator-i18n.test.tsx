/**
 * The default aria-label goes through i18n.
 *
 * The label used to be a prop-parameter default (`ariaLabel = 'Typing…'`), so
 * it rendered plain English in every locale — the pseudo-locale check saw it
 * in the recorded goldens and no lint rule sees a parameter default. These
 * tests mock `useTranslation` with a `t` that marks every key, so a default
 * that bypassed `t()` would show up as plain English.
 *
 * @module
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// A Proxy ClassMap that echoes each accessed member name back as its token —
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
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { TypingIndicator } = await import('../TypingIndicator.js')

describe('TypingIndicator i18n', () => {
  it('renders the default aria-label through t', () => {
    const markup = renderToStaticMarkup(createElement(TypingIndicator, {}))
    expect(markup).toContain('aria-label="«typingIndicator.aria.label»"')
  })

  it('an explicit ariaLabel overrides the translated label', () => {
    const markup = renderToStaticMarkup(
      createElement(TypingIndicator, { ariaLabel: 'Alice is typing' }),
    )
    expect(markup).toContain('aria-label="Alice is typing"')
  })
})
