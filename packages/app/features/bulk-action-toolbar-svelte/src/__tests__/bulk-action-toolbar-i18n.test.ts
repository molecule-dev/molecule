// @vitest-environment jsdom
/**
 * The Svelte `BulkActionToolbar`'s own text goes through i18n — the port of
 * `@molecule/app-bulk-action-toolbar-react/src/__tests__/bulk-action-toolbar-i18n.test.tsx`:
 * the same test name and assertion, with the Svelte binding's
 * `useTranslation` mocked instead of React's.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { BulkActionToolbar } from '../components.js'
import type { BulkActionToolbarProps } from '../types.js'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

describe('BulkActionToolbar i18n', () => {
  it('takes the toolbar label through i18n by default', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const props: BulkActionToolbarProps = { count: 1, actions }
    mounted.push(mount(BulkActionToolbar, { target, props: props as never }))
    flushSync()
    const region = target.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('«bulkActions.aria.toolbar»')
    expect(region?.getAttribute('aria-label')).not.toBe('Bulk actions')
  })
})
