// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ActionMenu` — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A Proxy ClassMap that echoes each accessed member name back as its token, so
// tests can assert *which* cm.* member a class came from (e.g. `textError`,
// `borderAll`) without depending on the Tailwind bond's concrete strings — the
// same mock the React tests use.
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

// A Button marker that shows the popover can be opened: it forwards the click
// and every pass-through attribute (aria-*, data-mol-id) onto a native
// <button>, as the React suite's Button mock does.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'Button',
      inheritAttrs: false,
      emits: ['click'],
      setup(_props, { attrs, slots, emit }) {
        return () =>
          h(
            'button',
            {
              'data-button': '',
              onClick: (event: MouseEvent) => emit('click', event),
              'aria-label': attrs['aria-label'],
              'aria-haspopup': attrs['aria-haspopup'],
              'aria-expanded': attrs['aria-expanded'],
              'data-mol-id': attrs['data-mol-id'],
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { ActionMenu } from '../ActionMenu.js'
import type { ActionMenuProps } from '../types.js'

/** A mounted menu: its host element and a teardown. */
interface Mounted {
  host: HTMLElement
  unmount(): void
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.unmount()
})

/**
 * Renders an {@link ActionMenu}.
 *
 * @param props - Props to pass to `<ActionMenu>`.
 * @param slots - Named slots (e.g. `trigger`).
 * @returns The mounted host.
 */
function render(props: ActionMenuProps, slots?: Record<string, () => VNodeChild[]>): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ActionMenu, props, slots) }))
  app.mount(host)
  const entry = {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

/**
 * Renders the menu and clicks its trigger open.
 *
 * @param props - Props to pass to `<ActionMenu>`.
 * @returns The mounted host with the menu opened.
 */
async function renderOpen(props: ActionMenuProps): Promise<Mounted> {
  const entry = render(props)
  const trigger = entry.host.querySelector<HTMLElement>('[data-mol-id="action-menu-trigger"]')
  if (!trigger) throw new Error('trigger not found')
  trigger.click()
  await nextTick()
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
    const { host } = render({ items }, { trigger: () => [h('span', { 'data-trigger': '' })] })
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
  it('opens the popover on click and marks the trigger expanded', async () => {
    const { host } = await renderOpen({ items })
    const menu = host.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('data-mol-id')).toBe('action-menu-list')
    expect(
      host.querySelector('[data-mol-id="action-menu-trigger"]')?.getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('styles the popover border from theme tokens, not a hardcoded rgba border', async () => {
    const { host } = await renderOpen({ items })
    const menu = host.querySelector('[role="menu"]')
    const cls = menu?.getAttribute('class') ?? ''
    // Border + surface come from cm.borderAll / cm.surface (theme tokens).
    expect(cls).toContain('borderAll')
    expect(cls).toContain('surface')
    // No light-only hardcoded border/background left inline.
    const style = menu?.getAttribute('style') ?? ''
    expect(style).not.toContain('solid')
    expect(style.toLowerCase()).not.toContain('var(--color-surface')
  })

  it('gives every menu item a data-mol-id', async () => {
    const { host } = await renderOpen({ items })
    expect(host.querySelector('[data-mol-id="action-menu-item-edit"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="action-menu-item-delete"]')).not.toBeNull()
  })

  it('renders a destructive item in the theme error color', async () => {
    const { host } = await renderOpen({ items })
    const del = host.querySelector('[data-mol-id="action-menu-item-delete"]')
    const edit = host.querySelector('[data-mol-id="action-menu-item-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    // A non-destructive item must NOT pick up the error color.
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('renders a destructive href item as an anchor in the error color', async () => {
    const { host } = await renderOpen({
      items: [{ id: 'remove', label: 'Remove', href: '/remove', destructive: true }],
    })
    const anchor = host.querySelector<HTMLAnchorElement>('[data-mol-id="action-menu-item-remove"]')
    expect(anchor?.tagName).toBe('A')
    expect(anchor?.getAttribute('href')).toBe('/remove')
    expect(anchor?.getAttribute('class')).toContain('textError')
  })

  it('renders the divider from a theme border token, not a hardcoded rgba', async () => {
    const { host } = await renderOpen({
      items: [
        { id: 'edit', label: 'Edit', divider: true },
        { id: 'delete', label: 'Delete', destructive: true },
      ],
    })
    const divider = host.querySelector('span[aria-hidden="true"]')
    expect(divider).not.toBeNull()
    expect(divider?.getAttribute('class')).toContain('bgBorder')
    const style = divider?.getAttribute('style') ?? ''
    expect(style).not.toContain('rgba')
    expect(style).not.toContain('background')
  })
})
