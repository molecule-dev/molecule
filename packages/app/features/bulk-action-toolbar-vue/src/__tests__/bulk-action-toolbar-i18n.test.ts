// @vitest-environment jsdom
/**
 * The Vue `BulkActionToolbar`'s own text goes through i18n — the port of
 * `@molecule/app-bulk-action-toolbar-react/src/__tests__/bulk-action-toolbar-i18n.test.tsx`:
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { BulkActionToolbar } = await import('../BulkActionToolbar.js')

import { createApp, defineComponent, h } from 'vue'

import type { BulkActionToolbarProps } from '../types.js'

/** Renders a {@link BulkActionToolbar} and returns the markup it produced. */
const render = (props: BulkActionToolbarProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(BulkActionToolbar, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

describe('BulkActionToolbar i18n', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('takes the toolbar label through i18n by default', () => {
    const markup = render({ count: 1, actions })
    expect(markup).toContain('aria-label="«bulkActions.aria.toolbar»"')
    expect(markup).not.toContain('aria-label="Bulk actions"')
  })
})
