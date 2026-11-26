// @vitest-environment jsdom
/**
 * The Solid `Breadcrumb`'s own text goes through i18n — the port of
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb-i18n.test.tsx`:
 * the same test name and assertion, with the Solid binding's
 * `useTranslation` mocked instead of React's.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { Breadcrumb } = await import('../Breadcrumb.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders with Solid's browser renderer and disposes after the test. */
const mountView = (view: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

describe('Breadcrumb i18n', () => {
  it('takes the nav label through i18n by default', () => {
    const container = mountView(() => <Breadcrumb items={items} />)
    expect(container.innerHTML).toContain('aria-label="«breadcrumb.aria.breadcrumb»"')
    expect(container.innerHTML).not.toContain('aria-label="Breadcrumb"')
  })
})
