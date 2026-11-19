// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `StatusBadge` / `StatusPill` — ports of
 * `@molecule/app-status-badge-react/src/__tests__/status-badge.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy: `cn(...)` joins tokens (calling function-valued args
// first) and `badge({ variant })` maps to a real `bg-<color>` utility — the
// same mock the React suite installs.
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
        if (prop === 'badge') {
          return (opts?: { variant?: string }) => `badge bg-${opts?.variant ?? 'default'}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The `<Badge>` marker the React suite mocks `@molecule/app-ui-react` with.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Badge } = await import('./stubs/BadgeStub.svelte')
  return { Badge }
})

import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

const { StatusBadge, StatusPill } = await import('../components.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Renders a component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The rendered markup.
 */
const render = <Props extends object>(
  component: Component<Props>,
  props: NoInfer<Props>,
): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(instance)
  target.remove()
  return markup
}

describe('StatusBadge', () => {
  it('renders the ui-appearance Badge by default with the kind-mapped color', () => {
    const markup = render(StatusBadge, { kind: 'success', children: raw('Open') })
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-color="success"')
    expect(markup).toContain('Open')
  })

  it('maps the neutral kind to the secondary Badge color', () => {
    const markup = render(StatusBadge, { kind: 'neutral', children: raw('Archived') })
    expect(markup).toContain('data-color="secondary"')
  })

  it('renders a plain <span> pill (no Badge) for the uppercase-pill appearance', () => {
    const markup = render(StatusBadge, {
      kind: 'error',
      appearance: 'uppercase-pill',
      children: raw('Failed'),
    })
    expect(markup).not.toContain('data-badge')
    expect(markup).toContain('uppercase')
    expect(markup).toContain('Failed')
  })

  it.each([
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['error', 'bg-error'],
    ['info', 'bg-info'],
    ['neutral', 'bg-secondary'],
  ] as const)('colors the %s uppercase-pill with a real theme token', (kind, colorToken) => {
    const markup = render(StatusBadge, {
      kind,
      appearance: 'uppercase-pill',
      children: raw('X'),
    })
    expect(markup).toContain(colorToken)
    expect(markup).not.toMatch(/bg-[a-z]+-container/)
  })

  it('renders the leading icon', () => {
    const markup = render(StatusBadge, {
      children: raw('X'),
      icon: raw('<i data-icon=""></i>'),
    })
    expect(markup).toContain('data-icon=""')
  })

  it('forwards className in both appearances', () => {
    expect(render(StatusBadge, { className: 'sb-cls', children: raw('X') })).toContain('sb-cls')
    expect(
      render(StatusBadge, {
        appearance: 'uppercase-pill',
        className: 'sb-cls',
        children: raw('X'),
      }),
    ).toContain('sb-cls')
  })
})

describe('StatusPill', () => {
  it('renders its children', () => {
    const markup = render(StatusPill, { children: raw('Pending') })
    expect(markup).toContain('Pending')
  })

  it('renders the leading dot by default and omits it when dot={false}', () => {
    const withDot = render(StatusPill, { kind: 'success', children: raw('X') })
    expect(withDot).toContain('aria-hidden')
    const without = render(StatusPill, { dot: false, children: raw('X') })
    expect(without).not.toContain('aria-hidden')
  })

  it('forwards className', () => {
    const markup = render(StatusPill, { className: 'sp-cls', children: raw('X') })
    expect(markup).toContain('sp-cls')
  })
})
