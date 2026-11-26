// @vitest-environment jsdom
/**
 * Unit tests for the Solid `StatusBadge` / `StatusPill` — ports of
 * `@molecule/app-status-badge-react/src/__tests__/status-badge.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy: `cn(...)` joins tokens (calling function-valued args
// first) and `badge({ variant })` maps to a real `bg-<color>` utility — the
// same mock the React suite installs.
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
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Badge: (props: { children?: JSX.Element; color?: string; className?: string }) => (
    <span data-badge="" data-color={props.color} class={props.className}>
      {props.children}
    </span>
  ),
}))

import { render } from 'solid-js/web'

const { StatusBadge } = await import('../StatusBadge.jsx')
const { StatusPill } = await import('../StatusPill.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a view with Solid's browser renderer and returns its container.
 *
 * @param view - The view thunk.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('StatusBadge', () => {
  it('renders the ui-appearance Badge by default with the kind-mapped color', () => {
    const container = mount(() => <StatusBadge kind="success">Open</StatusBadge>)
    expect(container.innerHTML).toContain('data-badge=""')
    expect(container.innerHTML).toContain('data-color="success"')
    expect(container.innerHTML).toContain('Open')
  })

  it('maps the neutral kind to the secondary Badge color', () => {
    const container = mount(() => <StatusBadge kind="neutral">Archived</StatusBadge>)
    expect(container.innerHTML).toContain('data-color="secondary"')
  })

  it('renders a plain <span> pill (no Badge) for the uppercase-pill appearance', () => {
    const container = mount(() => (
      <StatusBadge kind="error" appearance="uppercase-pill">
        Failed
      </StatusBadge>
    ))
    expect(container.innerHTML).not.toContain('data-badge')
    expect(container.innerHTML).toContain('uppercase')
    expect(container.innerHTML).toContain('Failed')
  })

  it.each([
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['error', 'bg-error'],
    ['info', 'bg-info'],
    ['neutral', 'bg-secondary'],
  ] as const)('colors the %s uppercase-pill with a real theme token', (kind, colorToken) => {
    const container = mount(() => (
      <StatusBadge kind={kind} appearance="uppercase-pill">
        X
      </StatusBadge>
    ))
    expect(container.innerHTML).toContain(colorToken)
    expect(container.innerHTML).not.toMatch(/bg-[a-z]+-container/)
  })

  it('renders the leading icon', () => {
    const container = mount(() => <StatusBadge icon={<i data-icon="" />}>X</StatusBadge>)
    expect(container.innerHTML).toContain('data-icon=""')
  })

  it('forwards className in both appearances', () => {
    expect(mount(() => <StatusBadge className="sb-cls">X</StatusBadge>).innerHTML).toContain(
      'sb-cls',
    )
    expect(
      mount(() => (
        <StatusBadge appearance="uppercase-pill" className="sb-cls">
          X
        </StatusBadge>
      )).innerHTML,
    ).toContain('sb-cls')
  })
})

describe('StatusPill', () => {
  it('renders its children', () => {
    const container = mount(() => <StatusPill>Pending</StatusPill>)
    expect(container.innerHTML).toContain('Pending')
  })

  it('renders the leading dot by default and omits it when dot={false}', () => {
    const withDot = mount(() => <StatusPill kind="success">X</StatusPill>)
    expect(withDot.innerHTML).toContain('aria-hidden')
    const without = mount(() => <StatusPill dot={false}>X</StatusPill>)
    expect(without.innerHTML).not.toContain('aria-hidden')
  })

  it('forwards className', () => {
    const container = mount(() => <StatusPill className="sp-cls">X</StatusPill>)
    expect(container.innerHTML).toContain('sp-cls')
  })
})
