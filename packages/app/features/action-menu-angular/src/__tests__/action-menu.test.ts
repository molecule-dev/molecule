// @vitest-environment jsdom
/**
 * Unit tests for the Angular `ActionMenu` — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu.test.tsx`: the
 * same behavioral assertions, mounted through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserted on the markup the component produces.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

// A Button marker that shows the popover can be opened: the host IS a native
// <button> (as `button[mol-button]` is), so its click and every pass-through
// attribute behave as the React suite's Button mock does.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size', 'color', 'loading', 'className', 'disabled', 'type'],
      host: { 'data-button': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
        /** Button color. */
        color?: string
        /** Whether the button is busy. */
        loading?: boolean
        /** Extra classes. */
        className?: string
        /** Whether the button is disabled. */
        disabled?: boolean
        /** The button's `type` attribute. */
        type?: string
      },
    ),
  }
})

const { ActionMenu } = await import('../action-menu.component.js')

/** A mounted spec host: its DOM, a props setter, a flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection (after a DOM event). */
  tick(): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template.
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: async () => {
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts an {@link ActionMenu}.
 *
 * @param props - Props to pass to the component.
 * @param content - Extra projected content (a `slot="trigger"` node).
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}, content = ''): Promise<Mounted> {
  const m = await mount(
    `<span mol-action-menu [items]="p['items']" [trigger]="p['trigger']" [align]="p['align']" [triggerAriaLabel]="p['triggerAriaLabel']" [className]="p['className']">${content}</span>`,
    ActionMenu as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/**
 * Renders the menu and clicks its trigger open.
 *
 * @param props - Props to pass to the component.
 * @returns The mounted host with the menu opened.
 */
async function renderOpen(props: Record<string, unknown>): Promise<Mounted> {
  const m = await render(props)
  const trigger = m.host.querySelector<HTMLElement>('[data-mol-id="action-menu-trigger"]')
  if (!trigger) throw new Error('trigger not found')
  trigger.click()
  await m.tick()
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

describe('ActionMenu (trigger surface)', () => {
  it('renders the trigger with the default "Actions" aria-label', async () => {
    const m = await render({ items })
    const trigger = m.host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions')
  })

  it('carries a data-mol-id on the trigger', async () => {
    const m = await render({ items })
    expect(m.host.querySelector('[data-mol-id="action-menu-trigger"]')).not.toBeNull()
  })

  it('honours a custom triggerAriaLabel', async () => {
    const m = await render({ items, triggerAriaLabel: 'Row actions' })
    const trigger = m.host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('marks the trigger as a menu popup that starts collapsed', async () => {
    const m = await render({ items })
    const trigger = m.host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders the default "⋮" trigger glyph', async () => {
    const m = await render({ items })
    expect(m.host.textContent).toContain('⋮')
  })

  it('renders a custom trigger node', async () => {
    const m = await render({ items }, '<span slot="trigger" data-trigger></span>')
    expect(m.host.querySelector('[data-trigger]')).not.toBeNull()
    expect(m.host.textContent).not.toContain('⋮')
  })

  it('does not render the popover list before it is opened', async () => {
    const m = await render({ items })
    expect(m.host.querySelector('[role="menu"]')).toBeNull()
  })

  it('forwards className onto the wrapper', async () => {
    const m = await render({ items, className: 'am-cls' })
    expect(m.host.querySelector('.am-cls')).not.toBeNull()
  })
})

describe('ActionMenu (opened popover)', () => {
  it('opens the popover on click and marks the trigger expanded', async () => {
    const m = await renderOpen({ items })
    const menu = m.host.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('data-mol-id')).toBe('action-menu-list')
    expect(
      m.host.querySelector('[data-mol-id="action-menu-trigger"]')?.getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('styles the popover border from theme tokens, not a hardcoded rgba border', async () => {
    const m = await renderOpen({ items })
    const menu = m.host.querySelector('[role="menu"]')
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
    const m = await renderOpen({ items })
    expect(m.host.querySelector('[data-mol-id="action-menu-item-edit"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="action-menu-item-delete"]')).not.toBeNull()
  })

  it('renders a destructive item in the theme error color', async () => {
    const m = await renderOpen({ items })
    const del = m.host.querySelector('[data-mol-id="action-menu-item-delete"]')
    const edit = m.host.querySelector('[data-mol-id="action-menu-item-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    // A non-destructive item must NOT pick up the error color.
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('renders a destructive href item as an anchor in the error color', async () => {
    const m = await renderOpen({
      items: [{ id: 'remove', label: 'Remove', href: '/remove', destructive: true }],
    })
    const anchor = m.host.querySelector<HTMLAnchorElement>(
      '[data-mol-id="action-menu-item-remove"]',
    )
    expect(anchor?.tagName).toBe('A')
    expect(anchor?.getAttribute('href')).toBe('/remove')
    expect(anchor?.getAttribute('class')).toContain('textError')
  })

  it('renders the divider from a theme border token, not a hardcoded rgba', async () => {
    const m = await renderOpen({
      items: [
        { id: 'edit', label: 'Edit', divider: true },
        { id: 'delete', label: 'Delete', destructive: true },
      ],
    })
    const divider = m.host.querySelector('span[aria-hidden="true"]')
    expect(divider).not.toBeNull()
    expect(divider?.getAttribute('class')).toContain('bgBorder')
    const style = divider?.getAttribute('style') ?? ''
    expect(style).not.toContain('rgba')
    expect(style).not.toContain('background')
  })
})
