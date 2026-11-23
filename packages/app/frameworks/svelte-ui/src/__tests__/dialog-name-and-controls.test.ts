// @vitest-environment jsdom
/**
 * Accessible-name wiring for the framework dialogs and the Tabs
 * `aria-controls` contract (axe `aria-dialog-name` / `aria-valid-attr-value`),
 * mirroring `@molecule/app-ui-react`'s `dialog-name-and-controls` test:
 *
 * - ConfirmDialog and PromptDialog label their dialog element with the
 *   rendered title (and PromptDialog its rendered description) instead of
 *   leaving `<div role="dialog">` unnamed;
 * - SidebarUserCard's settings drawer (a title-less Modal) is named with the
 *   localized `sidebarUserCard.drawer` label;
 * - a Tabs tab only carries `aria-controls` when its panel is actually
 *   rendered (the active tab, when its item has content), and the value
 *   resolves to that panel's id.
 *
 * @module
 */
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

// The drawer label test reads a TRANSLATED value, so the stub resolves keys
// through a small table before falling back to the defaultValue.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      ({ 'sidebarUserCard.drawer': 'Konto' })[key] ?? opts?.defaultValue ?? key,
  }),
  // `state` is auto-subscribed (`$authState`), so the mock hands back a
  // minimal readable store, like the real auth client's.
  useAuth: () => ({
    state: {
      subscribe: (fn: (value: unknown) => void) => {
        fn({
          status: 'authenticated',
          user: { id: 'u1', name: 'Ada', email: 'ada@example.com' },
        })
        return () => {}
      },
    },
  }),
  useLocation: () => ({
    subscribe: (fn: (value: { pathname: string; search: string }) => void) => {
      fn({ pathname: '/', search: '' })
      return () => {}
    },
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type Component, flushSync, mount, unmount } from 'svelte'

const { default: ConfirmDialog } = await import('../components/ConfirmDialog.svelte')
const { default: PromptDialog } = await import('../components/PromptDialog.svelte')
const { default: SidebarUserCard } = await import('../components/SidebarUserCard.svelte')
const { default: Tabs } = await import('../components/Tabs.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

/** Mounts a component into a fresh host and registers its unmount. */
function mountComponent(
  component: Component<Record<string, unknown>>,
  props: Record<string, unknown>,
): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
}

describe('dialog and drawer accessible names', () => {
  it("ConfirmDialog's dialog aria-labelledby resolves to the title text", () => {
    mountComponent(ConfirmDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onConfirm: () => {},
      title: 'Delete vault?',
      description: 'This action cannot be undone.',
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog).not.toBeNull()
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const title = document.getElementById(labelledby!)
    expect(title?.tagName.toLowerCase()).toBe('h2')
    expect(title?.textContent).toBe('Delete vault?')
  })

  it("ConfirmDialog's dialog aria-describedby resolves to the description text", () => {
    mountComponent(ConfirmDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onConfirm: () => {},
      title: 'Delete vault?',
      description: 'This action cannot be undone.',
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const describedby = dialog.getAttribute('aria-describedby')
    expect(describedby).toBeTruthy()
    const description = document.getElementById(describedby!)
    expect(description?.tagName.toLowerCase()).toBe('p')
    expect(description?.textContent).toBe('This action cannot be undone.')
  })

  it('ConfirmDialog carries no aria-describedby without a description', () => {
    mountComponent(ConfirmDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onConfirm: () => {},
      title: 'Delete vault?',
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
  })

  it("PromptDialog's dialog aria-labelledby resolves to the title text", () => {
    mountComponent(PromptDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onSubmit: () => {},
      title: 'Rename board',
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const title = document.getElementById(labelledby!)
    expect(title?.tagName.toLowerCase()).toBe('h2')
    expect(title?.textContent).toBe('Rename board')
  })

  it("PromptDialog's dialog aria-describedby resolves to the rendered description", () => {
    mountComponent(PromptDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onSubmit: () => {},
      title: 'Rename board',
      description: 'The slug updates automatically.',
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const describedby = dialog.getAttribute('aria-describedby')
    expect(describedby).toBeTruthy()
    const description = document.getElementById(describedby!)
    expect(description?.tagName.toLowerCase()).toBe('p')
    expect(description?.textContent).toBe('The slug updates automatically.')
  })

  it('ConfirmDialog points its dialog at no heading when the title renders nothing', () => {
    mountComponent(ConfirmDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onConfirm: () => {},
      title: undefined,
      description: 'This action cannot be undone.',
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    expect(document.querySelector('h2')).not.toBeNull()
    expect(document.querySelector('h2')!.id).toBe('')
  })

  it('PromptDialog points its dialog at no heading when the title renders nothing', () => {
    mountComponent(PromptDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onSubmit: () => {},
      title: undefined,
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    expect(document.querySelector('h2')).not.toBeNull()
    expect(document.querySelector('h2')!.id).toBe('')
  })

  it('PromptDialog carries no aria-describedby without a description', () => {
    mountComponent(PromptDialog as Component<Record<string, unknown>>, {
      open: true,
      onClose: () => {},
      onSubmit: () => {},
      title: 'Rename board',
    })
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
  })

  it('the SidebarUserCard drawer has the translated label', async () => {
    mountComponent(SidebarUserCard as Component<Record<string, unknown>>, {})
    // Let the component's own $effects (the route-change close among them)
    // take their first pass BEFORE opening, the way a user's click arrives
    // after mount has settled — a click in the same synchronous block as
    // mount would be clobbered by that effect's first `open = false`.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const trigger = document.querySelector('[data-mol-id="sidebar-user-card"]') as HTMLElement
    expect(trigger).not.toBeNull()
    trigger.click()
    // The drawer renders through the portal after Svelte's effects settle.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const drawer = document.querySelector('[role="dialog"]') as HTMLElement
    expect(drawer).not.toBeNull()
    expect(drawer.getAttribute('aria-label')).toBe('Konto')
  })
})

describe('Tabs aria-controls', () => {
  const ITEMS = [
    { value: 'account', label: 'Account', content: 'Account settings' },
    { value: 'profile', label: 'Profile', content: 'Profile settings' },
  ]

  it('the active tab with content has an aria-controls that resolves to the rendered panel', () => {
    mountComponent(Tabs as Component<Record<string, unknown>>, { items: ITEMS })
    const active = [...document.querySelectorAll('[role="tab"]')].find(
      (tab) => (tab.textContent ?? '').trim() === 'Account',
    ) as HTMLElement
    const controls = active.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    const panel = document.getElementById(controls!)
    expect(panel?.getAttribute('role')).toBe('tabpanel')
    expect(panel?.textContent).toContain('Account settings')
  })

  it('a tab whose panel is not rendered has no aria-controls', () => {
    mountComponent(Tabs as Component<Record<string, unknown>>, { items: ITEMS })
    const inactive = [...document.querySelectorAll('[role="tab"]')].find(
      (tab) => (tab.textContent ?? '').trim() === 'Profile',
    ) as HTMLElement
    expect(inactive.getAttribute('aria-controls')).toBeNull()
  })

  it('an active tab without content has no aria-controls', () => {
    mountComponent(Tabs as Component<Record<string, unknown>>, {
      items: [
        { value: 'a', label: 'A', content: 'A body' },
        { value: 'b', label: 'B' },
      ],
      value: 'b',
    })
    const active = [...document.querySelectorAll('[role="tab"]')].find(
      (tab) => (tab.textContent ?? '').trim() === 'B',
    ) as HTMLElement
    expect(active.getAttribute('aria-controls')).toBeNull()
    expect(document.querySelector('[role="tabpanel"]')).toBeNull()
  })

  it('no tab carries aria-controls when no item has content', () => {
    mountComponent(Tabs as Component<Record<string, unknown>>, {
      items: ITEMS.map(({ value, label }) => ({ value, label })),
    })
    for (const tab of document.querySelectorAll('[role="tab"]'))
      expect(tab.getAttribute('aria-controls')).toBeNull()
  })
})
