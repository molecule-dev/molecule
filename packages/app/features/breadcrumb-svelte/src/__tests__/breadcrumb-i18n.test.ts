// @vitest-environment jsdom
/**
 * The Svelte `Breadcrumb`'s own text goes through i18n — the port of
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb-i18n.test.tsx`:
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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import Breadcrumb from '../Breadcrumb.svelte'

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('Breadcrumb i18n', () => {
  it('takes the nav label through i18n by default', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mounted.push(mount(Breadcrumb, { target, props: { items } }))
    flushSync()
    const nav = target.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('«breadcrumb.aria.breadcrumb»')
    expect(nav!.getAttribute('aria-label')).not.toBe('Breadcrumb')
  })
})
