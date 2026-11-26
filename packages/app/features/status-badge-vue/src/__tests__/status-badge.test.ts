// @vitest-environment jsdom
/**
 * Unit tests for the Vue `StatusBadge` / `StatusPill` — ports of
 * `@molecule/app-status-badge-react/src/__tests__/status-badge.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

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
        // Mirror the real `@molecule/app-ui-tailwind` badge resolver: a
        // `variant` maps to a real `bg-<color>` theme utility.
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

// The `<Badge>` marker the React suite mocks `@molecule/app-ui-react` with:
// a span carrying the color it received.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Badge: defineComponent({
      name: 'Badge',
      props: { color: String, className: String },
      setup(props, { slots }) {
        return () =>
          h(
            'span',
            { 'data-badge': '', 'data-color': props.color, class: props.className },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

const { StatusBadge } = await import('../StatusBadge.js')
const { StatusPill } = await import('../StatusPill.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Its slots.
 * @returns The rendered markup.
 */
const render = (
  component: unknown,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('StatusBadge', () => {
  it('renders the ui-appearance Badge by default with the kind-mapped color', () => {
    const markup = render(StatusBadge, { kind: 'success' }, { default: () => ['Open'] })
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-color="success"')
    expect(markup).toContain('Open')
  })

  it('maps the neutral kind to the secondary Badge color', () => {
    const markup = render(StatusBadge, { kind: 'neutral' }, { default: () => ['Archived'] })
    expect(markup).toContain('data-color="secondary"')
  })

  it('renders a plain <span> pill (no Badge) for the uppercase-pill appearance', () => {
    const markup = render(
      StatusBadge,
      { kind: 'error', appearance: 'uppercase-pill' },
      { default: () => ['Failed'] },
    )
    expect(markup).not.toContain('data-badge')
    expect(markup).toContain('uppercase')
    expect(markup).toContain('Failed')
  })

  // Every kind must color through a real ClassMap `badge` token (never a
  // `bg-*-container`).
  it.each([
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['error', 'bg-error'],
    ['info', 'bg-info'],
    ['neutral', 'bg-secondary'],
  ] as const)('colors the %s uppercase-pill with a real theme token', (kind, colorToken) => {
    const markup = render(
      StatusBadge,
      { kind, appearance: 'uppercase-pill' },
      { default: () => ['X'] },
    )
    expect(markup).toContain(colorToken)
    expect(markup).not.toContain('-container')
  })

  it('renders the leading icon', () => {
    const markup = render(
      StatusBadge,
      {},
      {
        default: () => ['X'],
        icon: () => [h('i', { 'data-icon': '' })],
      },
    )
    expect(markup).toContain('data-icon=""')
  })

  it('forwards className in both appearances', () => {
    expect(render(StatusBadge, { className: 'sb-cls' }, { default: () => ['X'] })).toContain(
      'sb-cls',
    )
    expect(
      render(
        StatusBadge,
        { appearance: 'uppercase-pill', className: 'sb-cls' },
        { default: () => ['X'] },
      ),
    ).toContain('sb-cls')
  })
})

describe('StatusPill', () => {
  it('renders its children', () => {
    const markup = render(StatusPill, {}, { default: () => ['Pending'] })
    expect(markup).toContain('Pending')
  })

  it('renders the leading dot by default and omits it when dot={false}', () => {
    const withDot = render(StatusPill, { kind: 'success' }, { default: () => ['X'] })
    expect(withDot).toContain('aria-hidden')
    const without = render(StatusPill, { dot: false }, { default: () => ['X'] })
    expect(without).not.toContain('aria-hidden')
  })

  it('forwards className', () => {
    const markup = render(StatusPill, { className: 'sp-cls' }, { default: () => ['X'] })
    expect(markup).toContain('sp-cls')
  })
})
