// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ActionMenu` — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ActionMenuProps } from '../types.js'

// A Proxy ClassMap that echoes each accessed member name back as its token, so
// tests can assert *which* cm.* member a class came from (e.g. `textError`,
// `borderAll`) without depending on the Tailwind bond's concrete strings — the
// same mock the React tests use.
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

// A Button marker that shows the popover can be opened: it forwards the click
// and every pass-through attribute (aria-*, data-mol-id) onto a native
// <button>, as the React suite's Button mock does.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    onClick?: () => void
    'aria-label'?: string
    'aria-haspopup'?: JSX.ButtonHTMLAttributes<HTMLButtonElement>['aria-haspopup']
    'aria-expanded'?: boolean
    'data-mol-id'?: string
  }) => (
    <button
      data-button=""
      onClick={() => props.onClick?.()}
      aria-label={props['aria-label']}
      aria-haspopup={props['aria-haspopup']}
      aria-expanded={props['aria-expanded']}
      data-mol-id={props['data-mol-id']}
    >
      {props.children}
    </button>
  ),
}))

const { ActionMenu } = await import('../ActionMenu.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders an {@link ActionMenu} with Solid's browser renderer.
 *
 * @param props - Props to pass to `<ActionMenu>`.
 * @returns The container element.
 */
function mount(props: ActionMenuProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <ActionMenu {...props} />, container))
  return container
}

/**
 * Renders the menu and clicks its trigger open.
 *
 * @param props - Props to pass to `<ActionMenu>`.
 * @returns The container with the menu opened.
 */
function mountOpen(props: ActionMenuProps): HTMLElement {
  const container = mount(props)
  const trigger = container.querySelector<HTMLElement>('[data-mol-id="action-menu-trigger"]')
  if (!trigger) throw new Error('trigger not found')
  trigger.click()
  return container
}

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

describe('ActionMenu (trigger surface)', () => {
  it('renders the trigger with the default "Actions" aria-label', () => {
    const container = mount({ items })
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions')
  })

  it('carries a data-mol-id on the trigger', () => {
    const container = mount({ items })
    expect(container.querySelector('[data-mol-id="action-menu-trigger"]')).not.toBeNull()
  })

  it('honours a custom triggerAriaLabel', () => {
    const container = mount({ items, triggerAriaLabel: 'Row actions' })
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('marks the trigger as a menu popup that starts collapsed', () => {
    const container = mount({ items })
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders the default "⋮" trigger glyph', () => {
    const container = mount({ items })
    expect(container.textContent).toContain('⋮')
  })

  it('renders a custom trigger node', () => {
    const container = mount({ items, trigger: <span data-trigger="" /> })
    expect(container.querySelector('[data-trigger]')).not.toBeNull()
    expect(container.textContent).not.toContain('⋮')
  })

  it('does not render the popover list before it is opened', () => {
    const container = mount({ items })
    expect(container.querySelector('[role="menu"]')).toBeNull()
  })

  it('forwards className onto the wrapper', () => {
    const container = mount({ items, className: 'am-cls' })
    expect(container.querySelector('.am-cls')).not.toBeNull()
  })
})

describe('ActionMenu (opened popover)', () => {
  it('opens the popover on click and marks the trigger expanded', () => {
    const container = mountOpen({ items })
    const menu = container.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('data-mol-id')).toBe('action-menu-list')
    expect(
      container.querySelector('[data-mol-id="action-menu-trigger"]')?.getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('styles the popover border from theme tokens, not a hardcoded rgba border', () => {
    const container = mountOpen({ items })
    const menu = container.querySelector('[role="menu"]')
    const cls = menu?.getAttribute('class') ?? ''
    // Border + surface come from cm.borderAll / cm.surface (theme tokens).
    expect(cls).toContain('borderAll')
    expect(cls).toContain('surface')
    // No light-only hardcoded border/background left inline.
    const style = menu?.getAttribute('style') ?? ''
    expect(style).not.toContain('solid')
    expect(style.toLowerCase()).not.toContain('var(--color-surface')
  })

  it('gives every menu item a data-mol-id', () => {
    const container = mountOpen({ items })
    expect(container.querySelector('[data-mol-id="action-menu-item-edit"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="action-menu-item-delete"]')).not.toBeNull()
  })

  it('renders a destructive item in the theme error color', () => {
    const container = mountOpen({ items })
    const del = container.querySelector('[data-mol-id="action-menu-item-delete"]')
    const edit = container.querySelector('[data-mol-id="action-menu-item-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    // A non-destructive item must NOT pick up the error color.
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('renders a destructive href item as an anchor in the error color', () => {
    const container = mountOpen({
      items: [{ id: 'remove', label: 'Remove', href: '/remove', destructive: true }],
    })
    const anchor = container.querySelector<HTMLAnchorElement>(
      '[data-mol-id="action-menu-item-remove"]',
    )
    expect(anchor?.tagName).toBe('A')
    expect(anchor?.getAttribute('href')).toBe('/remove')
    expect(anchor?.getAttribute('class')).toContain('textError')
  })

  it('renders the divider from a theme border token, not a hardcoded rgba', () => {
    const container = mountOpen({
      items: [
        { id: 'edit', label: 'Edit', divider: true },
        { id: 'delete', label: 'Delete', destructive: true },
      ],
    })
    const divider = container.querySelector('span[aria-hidden="true"]')
    expect(divider).not.toBeNull()
    expect(divider?.getAttribute('class')).toContain('bgBorder')
    const style = divider?.getAttribute('style') ?? ''
    expect(style).not.toContain('rgba')
    expect(style).not.toContain('background')
  })
})
