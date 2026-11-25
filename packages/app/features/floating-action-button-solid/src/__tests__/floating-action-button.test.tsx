// @vitest-environment jsdom
/**
 * Unit tests for the Solid `FloatingActionButton` — a port of
 * `@molecule/app-floating-action-button-react/src/__tests__/floating-action-button.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* call was applied without a real bond — the same mock the
// React package's own tests use.
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { FloatingActionButton } = await import('../FloatingActionButton.jsx')
const { MoleculeProvider } = await import('@molecule/app-solid')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a {@link FloatingActionButton} with Solid's browser renderer and
 * returns the markup it produced.
 *
 * @param view - The element to render.
 * @returns The rendered markup.
 */
const html = (view: () => JSX.Element): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

const icon = <span data-icon="" />

describe('FloatingActionButton', () => {
  it('renders a <button> when onClick is supplied', () => {
    const markup = html(() => <FloatingActionButton icon={icon} label="Add" onClick={() => {}} />)
    expect(markup.startsWith('<button')).toBe(true)
    expect(markup).toContain('data-icon=""')
  })

  it('renders an <a> when href is supplied', () => {
    // The link navigates in-app through the router, as an app mounts one.
    const markup = html(() => (
      <MoleculeProvider router={createMemoryRouter()}>
        <FloatingActionButton icon={icon} label="Add" href="/new" />
      </MoleculeProvider>
    ))
    expect(markup.startsWith('<a')).toBe(true)
    expect(markup).toContain('href="/new"')
  })

  it('uses the label as the aria-label', () => {
    const markup = html(() => (
      <FloatingActionButton icon={icon} label="New item" onClick={() => {}} />
    ))
    expect(markup).toContain('aria-label="New item"')
  })

  it('renders the tooltip title by default and drops it when showTooltip is false', () => {
    const withTip = html(() => <FloatingActionButton icon={icon} label="Add" onClick={() => {}} />)
    expect(withTip).toContain('title="Add"')
    const without = html(() => (
      <FloatingActionButton icon={icon} label="Add" onClick={() => {}} showTooltip={false} />
    ))
    expect(without).not.toContain('title=')
  })

  it('anchors to the requested screen corner via inline style', () => {
    const markup = html(() => (
      <FloatingActionButton icon={icon} label="Add" onClick={() => {}} position="top-left" />
    ))
    expect(markup).toMatch(/position:\s*fixed/)
    expect(markup).toMatch(/left:\s*24px/)
    expect(markup).toMatch(/top:\s*24px/)
  })

  it('sizes the button from the size preset', () => {
    const markup = html(() => (
      <FloatingActionButton icon={icon} label="Add" onClick={() => {}} size="lg" />
    ))
    // lg → 16 * 4 = 64px
    expect(markup).toMatch(/width:\s*64px/)
  })

  it('forwards className', () => {
    const markup = html(() => (
      <FloatingActionButton icon={icon} label="Add" onClick={() => {}} className="fab-cls" />
    ))
    expect(markup).toContain('fab-cls')
  })

  it('applies a visible default surface (background + elevation) out of the box', () => {
    const markup = html(() => <FloatingActionButton icon={icon} label="Add" onClick={() => {}} />)
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // A FAB is a prominent primary action — its default surface must not be
    // empty (the pre-fix bug: a transparent, invisible circle).
    expect(cls.length).toBeGreaterThan(0)
    expect(cls).toContain('gradientPrimary')
    expect(cls).toContain('shadowLifted')
  })

  it('lets an explicit className override/compose over the default surface', () => {
    const markup = html(() => (
      <FloatingActionButton icon={icon} label="Add" onClick={() => {}} className="fab-override" />
    ))
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // Caller class composes in…
    expect(cls).toContain('fab-override')
    // …and is emitted AFTER the default surface token, so under cm.cn's real
    // tailwind-merge a conflicting caller class wins (default is overridable).
    expect(cls.indexOf('fab-override')).toBeGreaterThan(cls.indexOf('gradientPrimary'))
  })
})
