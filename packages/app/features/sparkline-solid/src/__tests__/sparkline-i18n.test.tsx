// @vitest-environment jsdom
/**
 * The Solid `Sparkline`'s own text goes through i18n — a port of
 * `@molecule/app-sparkline-react/src/__tests__/sparkline-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. A
 * `useTranslation` whose `t` returns a marker proves the default aria-label
 * went through `t()` with its key; a default that bypassed `t()` would show
 * up as plain English.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import type { JSX } from 'solid-js'

const { Sparkline } = await import('../Sparkline.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view to render.
 * @returns The mount container.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('Sparkline i18n', () => {
  it('renders the default aria-label through t with its key', () => {
    const container = mount(() => <Sparkline values={[1, 2, 3]} />)
    expect(container.innerHTML).toContain('aria-label="«sparkline.aria.trendSparkline»"')
  })

  it('lets an explicit ariaLabel override the translated default', () => {
    const container = mount(() => <Sparkline values={[1, 2]} ariaLabel="Sales trend" />)
    const markup = container.innerHTML
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).not.toContain('«sparkline.aria.trendSparkline»')
  })
})
