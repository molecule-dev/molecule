// @vitest-environment jsdom
/**
 * PageHeader names its breadcrumb `<nav>` landmark through `t()` (the way
 * Modal names its close button), so a screen reader announces it in the
 * active language instead of hardcoded English.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

// A provider whose `t` marks the key it was asked for, so the assertion sees
// the key PageHeader renders with, not a translated string.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `⟦${key}⟧`,
  }),
}))

import { type Component, mount, unmount } from 'svelte'

const { default: PageHeader } = await import('../components/PageHeader.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
})

describe('PageHeader breadcrumb landmark', () => {
  it('PageHeader names its breadcrumb landmark through t()', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)
    mounted.push(
      mount(
        PageHeader as Component<{
          title: string
          breadcrumbs: { label: string; href?: string }[]
        }>,
        {
          target: host,
          props: {
            title: 'Dashboard',
            breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Reports' }],
          },
        },
      ),
    )
    const nav = host.querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav?.getAttribute('aria-label')).toBe('⟦ui.pageHeader.breadcrumbs⟧')
  })
})
