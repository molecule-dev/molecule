// @vitest-environment jsdom
/**
 * i18n for `NoteCard`'s own text: the pinned marker's accessible label.
 *
 * The label was a hardcoded `aria-label="Pinned"`, so every locale heard
 * English. The provider here marks every translation it serves (`«key»`), so
 * a string that bypassed `t()` shows up as plain English — the same trick the
 * conformance kit's pseudo-locale case uses.
 *
 * @module
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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
// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { NoteCard } = await import('../NoteCard.js')

/** The pinned card's static markup, the surface the label lives on. */
const pinnedCard = (): string =>
  renderToStaticMarkup(createElement(NoteCard, { body: 'b', pinned: true }))

describe('NoteCard i18n', () => {
  it('takes the pinned marker label through i18n by default', () => {
    expect(pinnedCard()).toContain('aria-label="«noteCard.aria.pinned»"')
  })

  it('renders the pinned marker with an image role so screen readers announce the label', () => {
    expect(pinnedCard()).toContain('role="img"')
  })
})
