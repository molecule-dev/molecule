// @vitest-environment jsdom
/**
 * PageHeader names its breadcrumb `<nav>` landmark through `t()` (the way
 * Modal names its close button), so a screen reader announces it in the
 * active language instead of hardcoded English.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'

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
        // read as a plain string (`className={cm.pageHeader}`).
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
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `⟦${key}⟧`,
  }),
}))

const { PageHeader } = await import('../components/PageHeader.js')

afterEach(() => {
  cleanup()
})

describe('PageHeader breadcrumb landmark', () => {
  it('PageHeader names its breadcrumb landmark through t()', () => {
    // A breadcrumb with an href is a router link, which an app always mounts inside its router.
    render(
      <RouterProvider router={createMemoryRouter({ initialEntries: ['/reports'] })}>
        <PageHeader
          title="Dashboard"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }]}
        />
      </RouterProvider>,
    )
    const nav = document.body.querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav?.getAttribute('aria-label')).toBe('⟦ui.pageHeader.breadcrumbs⟧')
  })
})
