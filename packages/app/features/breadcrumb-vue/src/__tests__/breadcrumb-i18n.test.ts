// @vitest-environment jsdom
/**
 * The Vue `Breadcrumb`'s own text goes through i18n — the port of
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb-i18n.test.tsx`:
 * the same test name and assertion, with the Vue binding's `useTranslation`
 * mocked instead of React's.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { Breadcrumb } = await import('../Breadcrumb.js')

import { createApp, defineComponent, h } from 'vue'

/** Renders a {@link Breadcrumb} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(Breadcrumb, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

describe('Breadcrumb i18n', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('takes the nav label through i18n by default', () => {
    const markup = render({ items })
    expect(markup).toContain('aria-label="«breadcrumb.aria.breadcrumb»"')
    expect(markup).not.toContain('aria-label="Breadcrumb"')
  })
})
