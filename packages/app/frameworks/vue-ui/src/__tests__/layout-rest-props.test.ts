// @vitest-environment jsdom
/**
 * Render tests pinning that the layout components (`Container`, `Flex`,
 * `Grid`, `Spacer`) forward unhandled props (`...rest`) to their root
 * element — Vue port of
 * `@molecule/app-ui-react/src/__tests__/layout-rest-props.test.tsx`. A
 * `data-mol-id` (or any `data-*`/aria attribute) passed to `Flex` reaches the
 * DOM, and a handled prop is consumed instead of leaking as an attribute.
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

import { type App, createApp, h, type RenderFunction } from 'vue'

const { Container, Flex, Grid, Spacer } = await import('../components/Layout.js')

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

/**
 * Mounts a render function into a fresh host and returns its root element.
 *
 * @param render - The component render.
 * @returns The mounted root element.
 */
function mountRoot(render: RenderFunction): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
  const root = host.firstElementChild
  if (!(root instanceof HTMLElement)) throw new Error('the render produced no element')
  return root
}

describe('layout components forward rest props to the DOM', () => {
  it('Flex passes data-mol-id + aria attributes through (and does not leak handled props)', () => {
    const el = mountRoot(() =>
      h(
        Flex,
        { justify: 'end', gap: 'sm', 'data-mol-id': 'row-actions', 'aria-label': 'Actions' },
        () => h('span', 'child'),
      ),
    )
    expect(el.getAttribute('data-mol-id')).toBe('row-actions')
    expect(el.getAttribute('aria-label')).toBe('Actions')
    // Handled props are consumed, never rendered as DOM attributes.
    expect(el.hasAttribute('justify')).toBe(false)
    expect(el.hasAttribute('gap')).toBe(false)
  })

  it('Flex forwards onClick together with the role, tabIndex and onKeyDown a clickable box needs', () => {
    const onClick = vi.fn()
    const onKeyDown = vi.fn()
    // Vue hyphenates everything after `on` in a listener prop, so the native
    // `keydown` listener is spelled `onKeydown` here (a template's `@keydown`
    // compiles to exactly this); React's `onKeyDown` would listen for a
    // `key-down` event nothing dispatches.
    const el = mountRoot(() =>
      h(Flex, { role: 'button', tabIndex: 0, onClick, onKeydown: onKeyDown }, () =>
        h('span', 'child'),
      ),
    )
    expect(el.getAttribute('role')).toBe('button')
    expect(el.tabIndex).toBe(0)
    el.click()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('Container passes data-mol-id through', () => {
    const el = mountRoot(() => h(Container, { 'data-mol-id': 'page-shell' }, () => 'x'))
    expect(el.getAttribute('data-mol-id')).toBe('page-shell')
  })

  it('Grid passes data-mol-id through (and does not leak columns)', () => {
    const el = mountRoot(() => h(Grid, { columns: 2, 'data-mol-id': 'stats-grid' }, () => 'x'))
    expect(el.getAttribute('data-mol-id')).toBe('stats-grid')
    expect(el.hasAttribute('columns')).toBe(false)
  })

  it('Spacer passes data-mol-id through', () => {
    const el = mountRoot(() => h(Spacer, { size: 'md', 'data-mol-id': 'section-gap' }))
    expect(el.getAttribute('data-mol-id')).toBe('section-gap')
    expect(el.hasAttribute('size')).toBe(false)
  })
})
