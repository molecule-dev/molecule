// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `FloatingActionButton` — a port of
 * `@molecule/app-floating-action-button-react/src/__tests__/floating-action-button.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte mount in jsdom.
 *
 * @module
 */

import { createRawSnippet, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* call was applied without a real bond — the same mock the
// React package's own tests use.
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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type { MoleculeConfig } from '@molecule/app-svelte'

import type { FloatingActionButtonProps } from '../types.js'
import FloatingActionButtonHost from './FloatingActionHost.svelte'

const { default: FloatingActionButton } = await import('../FloatingActionButton.svelte')

/** A snippet rendering the given markup, the way a caller fills the icon prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link FloatingActionButton} and returns its root element.
 *
 * @param props - The component props.
 * @param config - The molecule context to install above it (a router, which a link to an app path
 *   needs); none when omitted.
 * @returns The rendered root element.
 */
const root = (props: FloatingActionButtonProps, config?: MoleculeConfig): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(
    config
      ? mount(FloatingActionButtonHost, { target, props: { config, props } })
      : mount(FloatingActionButton, { target, props }),
  )
  const el = target.firstElementChild
  if (!(el instanceof HTMLElement)) throw new Error('no FloatingActionButton root rendered')
  return el
}

/**
 * Mounts a {@link FloatingActionButton} and returns the markup it produced.
 *
 * @param props - The component props.
 * @returns The rendered markup.
 */
const html = (props: FloatingActionButtonProps): string =>
  root(props).parentElement?.innerHTML ?? ''

const icon = raw('<span data-icon=""></span>')

describe('FloatingActionButton', () => {
  it('renders a <button> when onClick is supplied', () => {
    const markup = html({ icon, label: 'Add', onClick: () => {} })
    expect(root({ icon, label: 'Add', onClick: () => {} }).tagName).toBe('BUTTON')
    expect(markup).toContain('data-icon=""')
  })

  it('renders an <a> when href is supplied', () => {
    // The link navigates in-app through the router, as an app mounts one.
    const anchor = root({ icon, label: 'Add', href: '/new' }, { router: createMemoryRouter() })
    expect(anchor.tagName).toBe('A')
    expect(anchor.getAttribute('href')).toBe('/new')
  })

  it('uses the label as the aria-label', () => {
    const markup = html({ icon, label: 'New item', onClick: () => {} })
    expect(markup).toContain('aria-label="New item"')
  })

  it('renders the tooltip title by default and drops it when showTooltip is false', () => {
    const withTip = html({ icon, label: 'Add', onClick: () => {} })
    expect(withTip).toContain('title="Add"')
    const without = html({ icon, label: 'Add', onClick: () => {}, showTooltip: false })
    expect(without).not.toContain('title=')
  })

  it('anchors to the requested screen corner via inline style', () => {
    const markup = html({ icon, label: 'Add', onClick: () => {}, position: 'top-left' })
    expect(markup).toMatch(/position:\s*fixed/)
    expect(markup).toMatch(/left:\s*24px/)
    expect(markup).toMatch(/top:\s*24px/)
  })

  it('sizes the button from the size preset', () => {
    const markup = html({ icon, label: 'Add', onClick: () => {}, size: 'lg' })
    // lg → 16 * 4 = 64px
    expect(markup).toMatch(/width:\s*64px/)
  })

  it('forwards className', () => {
    const markup = html({ icon, label: 'Add', onClick: () => {}, className: 'fab-cls' })
    expect(markup).toContain('fab-cls')
  })

  it('applies a visible default surface (background + elevation) out of the box', () => {
    const markup = html({ icon, label: 'Add', onClick: () => {} })
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // A FAB is a prominent primary action — its default surface must not be
    // empty (the pre-fix bug: a transparent, invisible circle).
    expect(cls.length).toBeGreaterThan(0)
    expect(cls).toContain('gradientPrimary')
    expect(cls).toContain('shadowLifted')
  })

  it('lets an explicit className override/compose over the default surface', () => {
    const markup = html({ icon, label: 'Add', onClick: () => {}, className: 'fab-override' })
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // Caller class composes in…
    expect(cls).toContain('fab-override')
    // …and is emitted AFTER the default surface token, so under cm.cn's real
    // tailwind-merge a conflicting caller class wins (default is overridable).
    expect(cls.indexOf('fab-override')).toBeGreaterThan(cls.indexOf('gradientPrimary'))
  })
})
