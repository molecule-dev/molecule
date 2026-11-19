// @vitest-environment jsdom
/**
 * Svelte port of
 * `@molecule/app-ui-react/src/__tests__/responsive-app-shell.test.tsx`: the
 * mobile shell (top bar + dialog drawer) and the desktop shell (sidebar) mount
 * per the 768px breakpoint, and the drawer implements the dialog a11y contract
 * (focus trap/restore, Escape, backdrop, scroll lock, route-change auto-close).
 *
 * The framework differences: `render`/`rerender` becomes a mounted host
 * component whose rendered tree follows stores, so a route change is a router
 * notification plus a flush (`flush()`), and `renderHook` becomes a probe
 * component that paints the store's value. `ResponsiveAppShell.TopBar` (a
 * React compound-component property) has no Svelte counterpart: the family is
 * composed from the four named exports, which the contract test checks.
 *
 * @module
 */
import { fireEvent, within } from '@testing-library/dom'
import { flushSync, mount, tick, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteChangeListener, RouteLocation, Router } from '@molecule/app-routing'

// ---------------------------------------------------------------------------
// Router mock. The shell closes its drawer on every router notification (the
// framework's counterpart of React's `useLocation().key` dependency), so the
// mock carries a subscriber set the test fires after moving the location.
// ---------------------------------------------------------------------------
const routing = await vi.hoisted(async () => {
  const { writable } = await import('svelte/store')
  const initial: RouteLocation = { pathname: '/dashboard', search: '', hash: '', key: 'key-0' }
  const location = writable<RouteLocation>(initial)
  let current: RouteLocation = initial
  const listeners = new Set<RouteChangeListener>()
  const router: Pick<Router, 'subscribe'> = {
    subscribe(listener) {
      listeners.add(listener)
      listener(current, 'push')
      return () => {
        listeners.delete(listener)
      }
    },
  }
  const navigate = (next: RouteLocation): void => {
    current = next
    location.set(next)
    for (const listener of listeners) listener(next, 'push')
  }
  return { location, router, navigate }
})

// ---------------------------------------------------------------------------
// matchMedia mock. jsdom has no `window.matchMedia`; the shell's store reads it
// synchronously when it starts, so tests set `matches` BEFORE rendering.
// `setDesktop` + `fireViewportChange` simulate crossing 768px.
// ---------------------------------------------------------------------------
let matches = false
const changeListeners = new Set<(event: { matches: boolean }) => void>()

vi.mock('@molecule/app-svelte', () => ({
  getRouter: () => routing.router,
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Tokens the shell CALLS (resolvers with options) vs plain string tokens.
    const callable = new Set(['flex', 'minH', 'sp', 'h', 'w', 'maxW', 'position', 'stack'])
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
        if (callable.has(token)) return fn
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { default: ShellHost } = await import('./ResponsiveAppShellHost.svelte')
const { default: IsDesktopProbe } = await import('./IsDesktopProbe.svelte')
const {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellSidebar,
  ResponsiveAppShellTopBar,
} = await import('../components/index.js')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

const body = (): ReturnType<typeof within> => within(document.body)

/**
 * Sets the viewport class the mocked matchMedia reports.
 *
 * @param next - Whether the viewport is desktop-wide.
 */
function setDesktop(next: boolean): void {
  matches = next
}

/**
 * Flushes the queued component updates and their effects.
 *
 * @returns A promise resolved once the flush has run.
 */
async function flush(): Promise<void> {
  await tick()
  flushSync()
}

/** Fires the `change` listeners every mounted matchMedia subscription holds. */
async function fireViewportChange(): Promise<void> {
  for (const listener of changeListeners) listener({ matches })
  await flush()
}

beforeEach(() => {
  setDesktop(false)
  changeListeners.clear()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_type: string, cb: (event: { matches: boolean }) => void): void => {
        changeListeners.add(cb)
      },
      removeEventListener: (_type: string, cb: (event: { matches: boolean }) => void): void => {
        changeListeners.delete(cb)
      },
    }),
  })
})

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  matches = false
  routing.navigate({ pathname: '/dashboard', search: '', hash: '', key: 'key-0' })
})

/**
 * Mounts a component into a fresh container appended to the body.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The container element.
 */
function render(
  component: Parameters<typeof mount>[0],
  props: Record<string, unknown> = {},
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

/** Mounts the canonical shell composition. */
function renderShell(props: Record<string, unknown> = {}): void {
  render(ShellHost, props)
}

const trigger = (): HTMLElement => body().getByRole('button', { name: 'Open navigation menu' })

/** The drawer's close button (the panel's first tab stop). */
const closeButton = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-mol-id="shell-drawer-close"]')

/** Opens the drawer through its trigger and flushes. */
async function openDrawer(): Promise<void> {
  trigger().click()
  await flush()
}

describe('ResponsiveAppShell on mobile (<768px)', () => {
  it('renders top bar + content, with the sidebar unmounted and the drawer closed by default', () => {
    renderShell()
    expect(body().getByRole('banner')).toBeDefined()
    expect(body().getByRole('main')).toBeDefined()
    expect(body().getByText('Page body')).toBeDefined()
    // Desktop chrome must not exist — not even CSS-hidden.
    expect(body().queryByRole('complementary')).toBeNull()
    expect(body().queryByRole('dialog')).toBeNull()
    // The trigger is present, wired to the (absent) panel, and reports closed.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(trigger().getAttribute('aria-controls')).toBeTruthy()
  })

  it('the trigger opens the drawer dialog, moves focus into it, and reports expanded', async () => {
    renderShell()
    await openDrawer()

    const dialog = body().getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Primary navigation')
    expect(dialog.getAttribute('data-mol-id')).toBe('shell-drawer')
    // A nav landmark lives INSIDE the dialog, carrying the consumer's links.
    expect(within(dialog).getByRole('navigation').getAttribute('aria-label')).toBe(
      'Primary navigation',
    )
    expect(within(dialog).getByRole('link', { name: 'Projects' })).toBeDefined()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    // Focus moved to the panel's first tab stop (the close button), and the
    // trigger's aria-controls resolves to the panel's actual id.
    expect(document.activeElement).toBe(closeButton())
    expect(body().getByRole('dialog').id).toBe(trigger().getAttribute('aria-controls'))
    // Body scroll locks while the drawer is open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Escape closes the drawer, unlocks scroll, and restores focus to the trigger', async () => {
    renderShell()
    // A pointer click moves focus — focus the trigger first so the restore
    // assertion is meaningful.
    trigger().focus()
    await openDrawer()
    expect(body().getByRole('dialog')).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()

    expect(body().queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger())
  })

  it('a backdrop click closes the drawer but a click inside the panel does not', async () => {
    renderShell()
    await openDrawer()
    const dialog = body().getByRole('dialog')

    // Click on a link inside the panel — the panel stops propagation.
    within(dialog).getByText('Dashboard').click()
    await flush()
    expect(body().getByRole('dialog')).toBeDefined()

    // Click on the fixed backdrop wrapper (the panel's parent).
    dialog.parentElement?.click()
    await flush()
    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('the close button closes the drawer', async () => {
    renderShell()
    await openDrawer()
    body().getByRole('button', { name: 'Close navigation menu' }).click()
    await flush()
    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('Tab wraps from the last link back to the first tab stop (focus trap)', async () => {
    renderShell()
    await openDrawer()
    const dialog = body().getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    links[links.length - 1]?.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(closeButton())
  })

  it('Shift+Tab from the first tab stop wraps to the last link', async () => {
    renderShell()
    await openDrawer()
    closeButton()?.focus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    const dialog = body().getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    expect(document.activeElement).toBe(links[links.length - 1])
  })

  it('closes on SPA navigation so it never covers the next page', async () => {
    renderShell()
    await openDrawer()
    expect(body().getByRole('dialog')).toBeDefined()

    routing.navigate({ pathname: '/projects', search: '', hash: '', key: 'key-1' })
    await flush()

    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('closes on a same-route #top navigation — hash-only changes dismiss too', async () => {
    renderShell()
    await openDrawer()
    expect(body().getByRole('dialog')).toBeDefined()

    // The fleet's safe-target pattern appends a hash to the CURRENT path:
    // pathname and search are unchanged, only the router key moves.
    routing.navigate({ pathname: '/dashboard', search: '', hash: '#top', key: 'key-2' })
    await flush()

    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('carries the fleet data-mol-id defaults for locators', () => {
    renderShell()
    expect(document.querySelector('[data-mol-id="shell-root"]')).toBeDefined()
    expect(document.querySelector('[data-mol-id="shell-topbar"]')).toBeDefined()
    expect(trigger().getAttribute('data-mol-id')).toBe('shell-drawer-open')
    expect(document.querySelector('[data-mol-id="shell-content"]')).toBeDefined()
  })
})

describe('ResponsiveAppShell on desktop (>=768px)', () => {
  it('renders the sidebar nav landmarks + content, with no trigger and no drawer', () => {
    setDesktop(true)
    renderShell()

    const aside = body().getByRole('complementary')
    expect(aside.getAttribute('data-mol-id')).toBe('shell-sidebar')
    expect(within(aside).getByRole('navigation').getAttribute('aria-label')).toBe(
      'Primary navigation',
    )
    expect(within(aside).getByRole('link', { name: 'Reports' })).toBeDefined()
    expect(body().getByRole('main')).toBeDefined()

    // Mobile chrome must not exist — the drawer is inert on desktop.
    expect(body().queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('does not render the top bar when mobileOnly is set', () => {
    setDesktop(true)
    renderShell({ mobileOnlyTopBar: true })
    expect(body().queryByRole('banner')).toBeNull()
  })

  it('still renders the top bar on mobile when mobileOnly is set', () => {
    renderShell({ mobileOnlyTopBar: true })
    expect(body().getByRole('banner')).toBeDefined()
  })

  it('applies the sidebarWidth preset to the sidebar geometry', () => {
    setDesktop(true)
    renderShell({ sidebarWidth: 'lg', minimal: true })
    expect(body().getByRole('complementary').style.width).toBe('256px')
  })

  it('accepts an exact pixel sidebarWidth', () => {
    setDesktop(true)
    renderShell({ sidebarWidth: 300, minimal: true })
    expect(body().getByRole('complementary').style.width).toBe('300px')
  })
})

describe('ResponsiveAppShell across the breakpoint', () => {
  it('swaps the shell wholesale when the viewport crosses 768px', async () => {
    renderShell()
    expect(trigger()).toBeDefined()

    setDesktop(true)
    await fireViewportChange()

    expect(body().queryByRole('complementary')).not.toBeNull()
    expect(body().queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(body().queryByRole('banner')).not.toBeNull()

    setDesktop(false)
    await fireViewportChange()

    expect(body().queryByRole('complementary')).toBeNull()
    expect(trigger()).toBeDefined()
  })

  it('an open drawer closes on desktop-crossing resize and does not resurface back on mobile', async () => {
    renderShell()
    await openDrawer()
    expect(body().getByRole('dialog')).toBeDefined()

    setDesktop(true)
    await fireViewportChange()
    expect(body().queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')

    setDesktop(false)
    await fireViewportChange()
    // The logical open state was dropped at the crossing — no surprise drawer.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(body().queryByRole('dialog')).toBeNull()
  })
})

describe('ResponsiveAppShell contract', () => {
  it('exposes the sub-components both as dot-properties and named exports', () => {
    // Svelte has no compound-component properties on a component: the family
    // is composed from named exports (the React test's `ResponsiveAppShell.X`).
    // The observable contract is the same set — each sub-component is exported
    // and is its own component, so a shell can be composed from them.
    expect(ResponsiveAppShell).toBeTypeOf('function')
    expect(ResponsiveAppShellTopBar).toBeTypeOf('function')
    expect(ResponsiveAppShellSidebar).toBeTypeOf('function')
    expect(ResponsiveAppShellDrawer).toBeTypeOf('function')
    expect(ResponsiveAppShellContent).toBeTypeOf('function')
    expect(
      new Set([
        ResponsiveAppShellTopBar,
        ResponsiveAppShellSidebar,
        ResponsiveAppShellDrawer,
        ResponsiveAppShellContent,
      ]).size,
    ).toBe(4)
  })

  it('throws a directive error when a sub-component renders outside the shell', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(ResponsiveAppShellTopBar)).toThrow(
        /must be rendered inside <ResponsiveAppShell>/,
      )
      expect(() => render(ResponsiveAppShellDrawer)).toThrow(
        /must be rendered inside <ResponsiveAppShell>/,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('hides the menu trigger when no Drawer is composed', () => {
    renderShell({ withDrawer: false })
    expect(body().queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
  })
})

describe('useIsDesktop', () => {
  /** The rendered value of the probe component. */
  const desktopProbe = (): string | null | undefined =>
    document.querySelector('[data-mol-id="is-desktop"]')?.textContent

  it('reads matchMedia synchronously on first render and follows change events', async () => {
    setDesktop(true)
    render(IsDesktopProbe)
    // No flush: the first paint already carries the matchMedia answer.
    expect(desktopProbe()).toBe('true')

    setDesktop(false)
    await fireViewportChange()
    expect(desktopProbe()).toBe('false')
  })

  it('returns false (mobile shell) in non-browser environments', () => {
    const original = window.matchMedia
    Reflect.deleteProperty(window, 'matchMedia')
    try {
      render(IsDesktopProbe)
      expect(desktopProbe()).toBe('false')
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: original,
      })
    }
  })
})
