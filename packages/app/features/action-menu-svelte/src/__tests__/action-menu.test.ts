// @vitest-environment jsdom
/**
 * Unit tests for `ActionMenu` — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu.test.tsx`: the
 * same behavioral assertions, rendered with a real Svelte mount in jsdom and
 * the bonded ClassMap, so a class is asserted by the token the ClassMap
 * resolves it to.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { getClassMap } from '@molecule/app-ui'

import ActionMenu from '../ActionMenu.svelte'

const cm = getClassMap()

/** The class tokens of an element. */
const tokens = (el: Element | null | undefined): string[] =>
  (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/**
 * Whether an element carries every token a ClassMap class resolves to.
 *
 * @param el - The element.
 * @param classMapClass - The ClassMap value (one or more tokens).
 * @returns True when every token is present.
 */
const hasClass = (el: Element | null | undefined, classMapClass: string): boolean =>
  classMapClass
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => tokens(el).includes(token))

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** A mounted menu. */
interface Mounted {
  host: HTMLElement
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts an {@link ActionMenu} into the document body.
 *
 * @param props - Props to pass to the component.
 * @returns The mounted host.
 */
function render(props: Record<string, unknown>): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(ActionMenu, { target: host, props })
  flushSync()
  const entry = {
    host,
    destroy: async () => {
      await unmount(instance)
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

/**
 * Mounts the menu and clicks its trigger open.
 *
 * @param props - Props to pass to the component.
 * @returns The mounted host with the menu opened.
 */
function renderOpen(props: Record<string, unknown>): Mounted {
  const entry = render(props)
  const trigger = entry.host.querySelector<HTMLElement>('[data-mol-id="action-menu-trigger"]')
  if (!trigger) throw new Error('trigger not found')
  trigger.click()
  flushSync()
  return entry
}

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

describe('ActionMenu (trigger surface)', () => {
  it('renders the trigger with the default "Actions" aria-label', () => {
    const { host } = render({ items })
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions')
  })

  it('carries a data-mol-id on the trigger', () => {
    const { host } = render({ items })
    expect(host.querySelector('[data-mol-id="action-menu-trigger"]')).not.toBeNull()
  })

  it('honours a custom triggerAriaLabel', () => {
    const { host } = render({ items, triggerAriaLabel: 'Row actions' })
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('marks the trigger as a menu popup that starts collapsed', () => {
    const { host } = render({ items })
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders the default "⋮" trigger glyph', () => {
    const { host } = render({ items })
    expect(host.textContent).toContain('⋮')
  })

  it('renders a custom trigger node', () => {
    const { host } = render({ items, trigger: raw('<span data-trigger></span>') })
    expect(host.querySelector('[data-trigger]')).not.toBeNull()
    expect(host.textContent).not.toContain('⋮')
  })

  it('does not render the popover list before it is opened', () => {
    const { host } = render({ items })
    expect(host.querySelector('[role="menu"]')).toBeNull()
  })

  it('forwards className onto the wrapper', () => {
    const { host } = render({ items, className: 'am-cls' })
    expect(host.querySelector('.am-cls')).not.toBeNull()
  })
})

describe('ActionMenu (opened popover)', () => {
  it('opens the popover on click and marks the trigger expanded', () => {
    const { host } = renderOpen({ items })
    const menu = host.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('data-mol-id')).toBe('action-menu-list')
    expect(
      host.querySelector('[data-mol-id="action-menu-trigger"]')?.getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('styles the popover border from theme tokens, not a hardcoded rgba border', () => {
    const { host } = renderOpen({ items })
    const menu = host.querySelector('[role="menu"]')
    // Border + surface come from cm.borderAll / cm.surface (theme tokens).
    expect(hasClass(menu, cm.borderAll)).toBe(true)
    expect(hasClass(menu, cm.surface)).toBe(true)
    // No light-only hardcoded border/background left inline.
    const style = menu?.getAttribute('style') ?? ''
    expect(style).not.toContain('solid')
    expect(style.toLowerCase()).not.toContain('var(--color-surface')
  })

  it('gives every menu item a data-mol-id', () => {
    const { host } = renderOpen({ items })
    expect(host.querySelector('[data-mol-id="action-menu-item-edit"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="action-menu-item-delete"]')).not.toBeNull()
  })

  it('renders a destructive item in the theme error color', () => {
    const { host } = renderOpen({ items })
    const del = host.querySelector('[data-mol-id="action-menu-item-delete"]')
    const edit = host.querySelector('[data-mol-id="action-menu-item-edit"]')
    expect(hasClass(del, cm.textError)).toBe(true)
    // A non-destructive item must NOT pick up the error color.
    expect(hasClass(edit, cm.textError)).toBe(false)
  })

  it('renders a destructive href item as an anchor in the error color', () => {
    const { host } = renderOpen({
      items: [{ id: 'remove', label: 'Remove', href: '/remove', destructive: true }],
    })
    const anchor = host.querySelector<HTMLAnchorElement>('[data-mol-id="action-menu-item-remove"]')
    expect(anchor?.tagName).toBe('A')
    expect(anchor?.getAttribute('href')).toBe('/remove')
    expect(hasClass(anchor, cm.textError)).toBe(true)
  })

  it('renders the divider from a theme border token, not a hardcoded rgba', () => {
    const { host } = renderOpen({
      items: [
        { id: 'edit', label: 'Edit', divider: true },
        { id: 'delete', label: 'Delete', destructive: true },
      ],
    })
    const divider = host.querySelector('span[aria-hidden="true"]')
    expect(divider).not.toBeNull()
    expect(hasClass(divider, cm.bgBorder)).toBe(true)
    const style = divider?.getAttribute('style') ?? ''
    expect(style).not.toContain('rgba')
    expect(style).not.toContain('background')
  })
})
