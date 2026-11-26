// @vitest-environment jsdom
/**
 * `BaseProps.disabled` disables the controls a component renders: a disabled Tabs, Accordion or
 * Dropdown takes no input, and a disabled Card never calls `onClick`.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/disabled-controls.test.tsx` with the same
 * titles and the same queried observables (Svelte components are mounted directly, so the
 * rendered DOM is the assertion target).
 *
 * @module
 */
import { fireEvent, screen } from '@testing-library/dom'
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AppSvelte from '@molecule/app-svelte'

vi.mock('@molecule/app-svelte', async () => {
  const actual = await vi.importActual<typeof AppSvelte>('@molecule/app-svelte')
  const { writable } = await import('svelte/store')
  return {
    ...actual,
    // Dropdown reads the route; the kit's other Dropdown tests stub the same hook.
    useLocation: () => writable({ pathname: '/', search: '' }),
  }
})

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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const ui = await import('../index.js')
const { default: DropdownTriggerHost } = await import('./DropdownTriggerHost.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

/**
 * Mounts a component into a fresh host and flushes its effects.
 *
 * @param component - The component to mount.
 * @param props - The props to pass it.
 */
function show<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
}

/** A `children` snippet rendering plain text. */
const text = (value: string): Snippet => createRawSnippet(() => ({ render: () => value }))

describe('disabled controls', () => {
  it('a disabled Tabs disables every tab, and a click or an arrow key changes nothing', () => {
    const onChange = vi.fn()
    show(ui.Tabs, {
      disabled: true,
      onChange,
      items: [
        { value: 'a', label: 'A', content: 'A body' },
        { value: 'b', label: 'B', content: 'B body' },
      ],
    })
    const tabs = screen.getAllByRole('tab')
    expect(tabs.every((tab) => tab.hasAttribute('disabled'))).toBe(true)
    fireEvent.click(tabs[1]!)
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' })
    expect(onChange).not.toHaveBeenCalled()
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true')
  })

  it('a disabled Accordion disables every header, and a click opens nothing', () => {
    const onChange = vi.fn()
    show(ui.Accordion, {
      disabled: true,
      onChange,
      items: [{ value: 'a', header: 'A', content: 'Body' }],
    })
    const header = screen.getByRole('button', { name: /A/ })
    expect(header.hasAttribute('disabled')).toBe(true)
    fireEvent.click(header)
    expect(onChange).not.toHaveBeenCalled()
    expect(header.getAttribute('aria-expanded')).toBe('false')
  })

  it('a disabled Dropdown disables its trigger and never opens', () => {
    const onOpenChange = vi.fn()
    show(DropdownTriggerHost, {
      disabled: true,
      onOpenChange,
      label: 'Options',
      items: [{ value: 'a', label: 'A' }],
    })
    const trigger = screen.getByRole('button', { name: 'Options' })
    expect(trigger.hasAttribute('disabled')).toBe(true)
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })

  it('a disabled Dropdown with a text trigger is announced disabled and leaves the tab order', () => {
    const onOpenChange = vi.fn()
    show(ui.Dropdown, {
      disabled: true,
      onOpenChange,
      trigger: 'Options',
      items: [{ value: 'a', label: 'A' }],
    })
    const trigger = screen.getByRole('button', { name: 'Options' })
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect((trigger as HTMLElement).tabIndex).toBe(-1)
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('a disabled interactive Card is announced disabled and a click or Enter never calls onClick', () => {
    const onClick = vi.fn()
    show(ui.Card, {
      interactive: true,
      disabled: true,
      onClick,
      children: text('Clickable card'),
    })
    const card = screen.getByRole('button')
    expect(card.getAttribute('aria-disabled')).toBe('true')
    expect((card as HTMLElement).tabIndex).toBe(-1)
    expect(card.hasAttribute('disabled')).toBe(false)
    fireEvent.click(card)
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a disabled plain Card never calls onClick', () => {
    const onClick = vi.fn()
    show(ui.Card, {
      testId: 'plain-card',
      disabled: true,
      onClick,
      children: text('Plain card'),
    })
    fireEvent.click(screen.getByTestId('plain-card'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
