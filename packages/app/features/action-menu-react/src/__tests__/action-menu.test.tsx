// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A Proxy ClassMap that echoes each accessed member name back as its token, so
// tests can assert *which* cm.* member a class came from (e.g. `textError`,
// `borderAll`) without depending on the Tailwind bond's concrete strings.
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

// Mock Button forwards onClick (so the popover can be opened) and every
// pass-through attribute (aria-*, data-mol-id) onto a native <button>.
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    onClick,
    ['aria-label']: ariaLabel,
    ['aria-haspopup']: ariaHaspopup,
    ['aria-expanded']: ariaExpanded,
    ['data-mol-id']: dataMolId,
  }: {
    children?: ReactNode
    onClick?: () => void
    'aria-label'?: string
    'aria-haspopup'?: string
    'aria-expanded'?: boolean
    'data-mol-id'?: string
  }) =>
    createElement(
      'button',
      {
        'data-button': '',
        onClick,
        'aria-label': ariaLabel,
        'aria-haspopup': ariaHaspopup,
        'aria-expanded': ariaExpanded,
        'data-mol-id': dataMolId,
      },
      children,
    ),
}))

const { ActionMenu } = await import('../ActionMenu.js')

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

afterEach(() => cleanup())

/**
 * Render the menu and click its trigger open, returning the container.
 * @param props - Props to pass to `<ActionMenu>`.
 * @returns The testing-library container element with the menu opened.
 */
function renderOpen(props: Parameters<typeof ActionMenu>[0]): HTMLElement {
  const { container } = render(createElement(ActionMenu, props))
  const trigger = container.querySelector<HTMLElement>('[data-mol-id="action-menu-trigger"]')
  if (!trigger) throw new Error('trigger not found')
  fireEvent.click(trigger)
  return container
}

describe('ActionMenu (trigger surface)', () => {
  it('renders the trigger with the default "Actions" aria-label', () => {
    const { container } = render(createElement(ActionMenu, { items }))
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions')
  })

  it('carries a data-mol-id on the trigger', () => {
    const { container } = render(createElement(ActionMenu, { items }))
    expect(container.querySelector('[data-mol-id="action-menu-trigger"]')).not.toBeNull()
  })

  it('honours a custom triggerAriaLabel', () => {
    const { container } = render(
      createElement(ActionMenu, { items, triggerAriaLabel: 'Row actions' }),
    )
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('marks the trigger as a menu popup that starts collapsed', () => {
    const { container } = render(createElement(ActionMenu, { items }))
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders the default "⋮" trigger glyph', () => {
    const { container } = render(createElement(ActionMenu, { items }))
    expect(container.textContent).toContain('⋮')
  })

  it('renders a custom trigger node', () => {
    const { container } = render(
      createElement(ActionMenu, { items, trigger: createElement('span', { 'data-trigger': '' }) }),
    )
    expect(container.querySelector('[data-trigger]')).not.toBeNull()
    expect(container.textContent).not.toContain('⋮')
  })

  it('does not render the popover list before it is opened', () => {
    const { container } = render(createElement(ActionMenu, { items }))
    expect(container.querySelector('[role="menu"]')).toBeNull()
  })

  it('forwards className onto the wrapper', () => {
    const { container } = render(createElement(ActionMenu, { items, className: 'am-cls' }))
    expect(container.querySelector('.am-cls')).not.toBeNull()
  })
})

describe('ActionMenu (opened popover)', () => {
  it('opens the popover on click and marks the trigger expanded', () => {
    const container = renderOpen({ items })
    const menu = container.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('data-mol-id')).toBe('action-menu-list')
    expect(
      container.querySelector('[data-mol-id="action-menu-trigger"]')?.getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('styles the popover border from theme tokens, not a hardcoded rgba border', () => {
    const container = renderOpen({ items })
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
    const container = renderOpen({ items })
    expect(container.querySelector('[data-mol-id="action-menu-item-edit"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="action-menu-item-delete"]')).not.toBeNull()
  })

  it('renders a destructive item in the theme error color', () => {
    const container = renderOpen({ items })
    const del = container.querySelector('[data-mol-id="action-menu-item-delete"]')
    const edit = container.querySelector('[data-mol-id="action-menu-item-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    // A non-destructive item must NOT pick up the error color.
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('renders a destructive href item as an anchor in the error color', () => {
    const container = renderOpen({
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
    const container = renderOpen({
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
