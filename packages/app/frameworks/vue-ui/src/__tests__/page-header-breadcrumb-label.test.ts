// @vitest-environment jsdom
/**
 * PageHeader names its breadcrumb `<nav>` landmark through `t()` (the way
 * Modal names its close button), so a screen reader announces it in the
 * active language instead of hardcoded English. Rendered with real Vue; only
 * the translation hook is stubbed.
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
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        // PageHeader calls `cm.flex({ justify, align })`; every other token is
        // read as a plain string (`class: cm.pageHeader`).
        if (prop === 'flex') {
          return () => 'flex'
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

// A provider whose `t` marks the key it was asked for, so the assertion sees
// the key PageHeader renders with, not a translated string.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (key: string) => `⟦${key}⟧`,
  }),
}))

import { createApp, h } from 'vue'

const { PageHeader } = await import('../components/PageHeader.js')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('PageHeader breadcrumb landmark', () => {
  it('PageHeader names its breadcrumb landmark through t()', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      render: () =>
        h(PageHeader, {
          title: 'Dashboard',
          breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Reports' }],
        }),
    })
    app.mount(host)
    try {
      const nav = host.querySelector('nav')
      expect(nav).not.toBeNull()
      expect(nav?.getAttribute('aria-label')).toBe('⟦ui.pageHeader.breadcrumbs⟧')
    } finally {
      app.unmount()
    }
  })
})
