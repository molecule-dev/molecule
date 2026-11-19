// @vitest-environment jsdom
/**
 * Render tests pinning that the layout components (`Container`, `Flex`,
 * `Grid`, `Spacer`) forward unhandled props (`...rest`) to their root
 * element — matching `Button`'s established idiom. A `data-mol-id` (or any
 * `data-*`/aria attribute) passed to `Flex` must reach the DOM, preserving the
 * automation-id contract that every interactive element carries a
 * `data-mol-id`.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/layout-rest-props.test.tsx`.
 *
 * @module
 */
import { fireEvent } from '@testing-library/dom'
import { createRawSnippet, flushSync, mount, unmount } from 'svelte'
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import type { Snippet } from 'svelte'

const { default: Container } = await import('../components/Container.svelte')
const { default: Flex } = await import('../components/Flex.svelte')
const { default: Grid } = await import('../components/Grid.svelte')
const { default: Spacer } = await import('../components/Spacer.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
})

/**
 * Mounts a layout component into a fresh host and returns its root element.
 *
 * @param component - The layout component to mount.
 * @param props - The props to pass it.
 * @returns The mounted component's root element.
 */
function renderLayout(component: typeof Flex, props: Record<string, unknown>): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host.firstElementChild as HTMLElement
}

/** A snippet rendering a single `<span>child</span>`. */
const childSnippet: Snippet = createRawSnippet(() => ({ render: () => '<span>child</span>' }))

describe('layout components forward rest props to the DOM', () => {
  it('Flex passes data-mol-id + aria attributes through (and does not leak handled props)', () => {
    const el = renderLayout(Flex, {
      justify: 'end',
      gap: 'sm',
      'data-mol-id': 'row-actions',
      'aria-label': 'Actions',
      children: childSnippet,
    })
    expect(el.getAttribute('data-mol-id')).toBe('row-actions')
    expect(el.getAttribute('aria-label')).toBe('Actions')
    // Handled props are consumed, never rendered as DOM attributes.
    expect(el.hasAttribute('justify')).toBe(false)
    expect(el.hasAttribute('gap')).toBe(false)
  })

  it('Flex forwards onClick together with the role, tabIndex and onKeyDown a clickable box needs', () => {
    const onClick = vi.fn()
    const onKeyDown = vi.fn()
    const el = renderLayout(Flex, {
      role: 'button',
      tabIndex: 0,
      onClick,
      onKeyDown,
      children: childSnippet,
    })
    expect(el.getAttribute('role')).toBe('button')
    expect(el.tabIndex).toBe(0)
    fireEvent.click(el)
    fireEvent.keyDown(el, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('Container passes data-mol-id through', () => {
    const el = renderLayout(Container, {
      'data-mol-id': 'page-shell',
      children: createRawSnippet(() => ({ render: () => 'x' })),
    })
    expect(el.getAttribute('data-mol-id')).toBe('page-shell')
  })

  it('Grid passes data-mol-id through (and does not leak columns)', () => {
    const el = renderLayout(Grid, {
      columns: 2,
      'data-mol-id': 'stats-grid',
      children: createRawSnippet(() => ({ render: () => 'x' })),
    })
    expect(el.getAttribute('data-mol-id')).toBe('stats-grid')
    expect(el.hasAttribute('columns')).toBe(false)
  })

  it('Spacer passes data-mol-id through', () => {
    const el = renderLayout(Spacer, {
      size: 'md',
      'data-mol-id': 'section-gap',
    })
    expect(el.getAttribute('data-mol-id')).toBe('section-gap')
    expect(el.hasAttribute('size')).toBe(false)
  })
})
