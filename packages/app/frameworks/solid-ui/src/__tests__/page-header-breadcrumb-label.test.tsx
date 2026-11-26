// @vitest-environment jsdom
/**
 * PageHeader names its breadcrumb `<nav>` landmark through `t()` (the way
 * Modal names its close button), so a screen reader announces it in the
 * active language instead of hardcoded English.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `⟦${key}⟧`,
  }),
}))

import { render } from 'solid-js/web'

import { createMemoryRouter } from '@molecule/app-routing'

const { MoleculeProvider } = await import('@molecule/app-solid')
const { PageHeader } = await import('../components/PageHeader.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('PageHeader breadcrumb landmark', () => {
  it('PageHeader names its breadcrumb landmark through t()', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    // A breadcrumb with an href is a router link, which an app always mounts inside its router.
    const router = createMemoryRouter({ initialEntries: ['/reports'] })
    disposers.push(
      render(
        () => (
          <MoleculeProvider router={router}>
            <PageHeader
              title="Dashboard"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }]}
            />
          </MoleculeProvider>
        ),
        container,
      ),
    )
    const nav = container.querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav?.getAttribute('aria-label')).toBe('⟦ui.pageHeader.breadcrumbs⟧')
    router.destroy?.()
  })
})
