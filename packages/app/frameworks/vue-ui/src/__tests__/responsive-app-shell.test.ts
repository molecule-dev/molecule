// @vitest-environment jsdom
/**
 * Vue port of `@molecule/app-ui-react/src/__tests__/responsive-app-shell.test.tsx`:
 * the mobile shell (top bar + dialog drawer) and the desktop shell (sidebar)
 * mount per the 768px breakpoint, and the drawer implements the dialog a11y
 * contract (focus trap/restore, Escape, backdrop, scroll lock, route-change
 * auto-close).
 *
 * The framework differences: `render`/`rerender` becomes a mounted Vue app
 * whose rendered tree follows reactive state, so a route change is a
 * `location` update plus an update flush (`nextTick`), and `renderHook`
 * becomes a probe component that renders the composable's value.
 *
 * @module
 */
import { type BoundFunctions, fireEvent, type queries, within } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns — tests advance it to
// simulate SPA navigation; Vue reactivity performs the re-render.
const { location } = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  return {
    location: shallowRef<{ pathname: string; search: string; hash: string; key: string }>({
      pathname: '/dashboard',
      search: '',
      hash: '',
      key: 'key-0',
    }),
  }
})

// ---------------------------------------------------------------------------
// matchMedia mock. jsdom has no `window.matchMedia`; the shell reads it
// synchronously in `setup`, so tests set `matches` BEFORE rendering.
// `setDesktop` + `fireViewportChange` simulate crossing 768px.
// ---------------------------------------------------------------------------
let matches = false
const changeListeners = new Set<(e: { matches: boolean }) => void>()

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLocation: () => location,
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
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
        if (callable.has(token)) {
          return (..._args: unknown[]) => token
        }
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type App, createApp, defineComponent, h, nextTick, type VNode } from 'vue'

const {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellSidebar,
  ResponsiveAppShellTopBar,
  useIsDesktop,
} = await import('../components/ResponsiveAppShell.js')

const apps: App[] = []
const hosts: HTMLElement[] = []

/**
 * Mounts a render function into a fresh host appended to the document body.
 *
 * @param render - The root component's render function.
 */
function mountSync(render: () => unknown): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({ render: () => render() })
  app.mount(host)
  apps.push(app)
}

/**
 * Mounts a render function and awaits the post-mount update flush — the Vue
 * form of React Testing Library's `render()`, which lets commit-time state
 * updates settle before the first assertion.
 *
 * @param render - The root component's render function.
 * @returns A promise resolved once the mount's queued updates have flushed.
 */
async function mount(render: () => unknown): Promise<void> {
  mountSync(render)
  await flush()
}

/**
 * Awaits the update flush (two ticks: a post-flush watcher can schedule a
 * second flush, like the drawer's focus restore).
 *
 * @returns A promise resolved once both flushes have run.
 */
async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
}

const body = (): BoundFunctions<typeof queries> => within(document.body)

function setDesktop(next: boolean): void {
  matches = next
}

/**
 * Fires the `change` listeners every mounted matchMedia subscription holds.
 *
 * @returns A promise resolved once Vue has applied the resulting updates.
 */
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
      addEventListener: (_type: string, cb: (e: { matches: boolean }) => void): void => {
        changeListeners.add(cb)
      },
      removeEventListener: (_type: string, cb: (e: { matches: boolean }) => void): void => {
        changeListeners.delete(cb)
      },
    }),
  })
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  location.value = { pathname: '/dashboard', search: '', hash: '', key: 'key-0' }
})

/** The consumer's nav links, rendered into the sidebar or the drawer. */
function nav(): VNode[] {
  return [
    h('a', { href: '/dashboard' }, 'Dashboard'),
    h('a', { href: '/projects' }, 'Projects'),
    h('a', { href: '/reports' }, 'Reports'),
  ]
}

/**
 * The canonical shell composition the React test renders.
 *
 * @param options - Whether the top bar is mobile-only.
 * @returns The shell tree.
 */
function shellTree({ mobileOnlyTopBar = false }: { mobileOnlyTopBar?: boolean } = {}): VNode {
  return h(ResponsiveAppShell, null, {
    default: () => [
      h(ResponsiveAppShell.TopBar, {
        brand: h('span', 'Timetrack'),
        mobileOnly: mobileOnlyTopBar,
      }),
      h(ResponsiveAppShell.Sidebar, null, { default: nav }),
      h(ResponsiveAppShell.Drawer, null, { default: nav }),
      h(ResponsiveAppShell.Content, null, {
        default: () => h('p', null, 'Page body'),
      }),
    ],
  })
}

const trigger = (): HTMLElement => body().getByRole('button', { name: 'Open navigation menu' })

/** The drawer's close button (the panel's first tab stop). */
const closeButton = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-mol-id="shell-drawer-close"]')

describe('ResponsiveAppShell on mobile (<768px)', () => {
  it('renders top bar + content, with the sidebar unmounted and the drawer closed by default', async () => {
    await mount(shellTree)
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
    await mount(shellTree)
    trigger().click()
    await flush()

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
    await mount(shellTree)
    // A real pointer click moves focus — focus the trigger first so the
    // restore assertion is meaningful.
    trigger().focus()
    trigger().click()
    await flush()
    expect(body().getByRole('dialog')).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()

    expect(body().queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger())
  })

  it('unmounting the shell with the drawer open returns focus to the element focused before it opened', async () => {
    // Focused outside the shell, so the restore target survives the shell's removal (a click
    // through fireEvent does not move focus to the trigger).
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    await mount(shellTree)
    trigger().click()
    await flush()
    expect(body().getByRole('dialog')).toBeDefined()

    for (const app of apps.splice(0)) app.unmount()
    await flush()

    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('a backdrop click closes the drawer but a click inside the panel does not', async () => {
    await mount(shellTree)
    trigger().click()
    await flush()
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
    await mount(shellTree)
    trigger().click()
    await flush()
    body().getByRole('button', { name: 'Close navigation menu' }).click()
    await flush()
    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('Tab wraps from the last link back to the first tab stop (focus trap)', async () => {
    await mount(shellTree)
    trigger().click()
    await flush()
    const dialog = body().getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    links[links.length - 1]?.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(closeButton())
  })

  it('Shift+Tab from the first tab stop wraps to the last link', async () => {
    await mount(shellTree)
    trigger().click()
    await flush()
    closeButton()?.focus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    const dialog = body().getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    expect(document.activeElement).toBe(links[links.length - 1])
  })

  it('closes on SPA navigation so it never covers the next page', async () => {
    await mount(shellTree)
    trigger().click()
    await flush()
    expect(body().getByRole('dialog')).toBeDefined()

    location.value = { pathname: '/projects', search: '', hash: '', key: 'key-1' }
    await flush()

    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('closes on a same-route #top navigation — hash-only changes dismiss too', async () => {
    await mount(shellTree)
    trigger().click()
    await flush()
    expect(body().getByRole('dialog')).toBeDefined()

    // The fleet's safe-target pattern appends a hash to the CURRENT path:
    // pathname and search are unchanged, only the router key moves.
    location.value = { pathname: '/dashboard', search: '', hash: '#top', key: 'key-2' }
    await flush()

    expect(body().queryByRole('dialog')).toBeNull()
  })

  it('carries the fleet data-mol-id defaults for locators', async () => {
    await mount(shellTree)
    expect(document.querySelector('[data-mol-id="shell-root"]')).toBeDefined()
    expect(document.querySelector('[data-mol-id="shell-topbar"]')).toBeDefined()
    expect(trigger().getAttribute('data-mol-id')).toBe('shell-drawer-open')
    expect(document.querySelector('[data-mol-id="shell-content"]')).toBeDefined()
  })
})

describe('ResponsiveAppShell on desktop (>=768px)', () => {
  it('renders the sidebar nav landmarks + content, with no trigger and no drawer', async () => {
    setDesktop(true)
    await mount(shellTree)

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

  it('does not render the top bar when mobileOnly is set', async () => {
    setDesktop(true)
    await mount(() => shellTree({ mobileOnlyTopBar: true }))
    expect(body().queryByRole('banner')).toBeNull()
  })

  it('still renders the top bar on mobile when mobileOnly is set', async () => {
    await mount(() => shellTree({ mobileOnlyTopBar: true }))
    expect(body().getByRole('banner')).toBeDefined()
  })

  it('applies the sidebarWidth preset to the sidebar geometry', async () => {
    setDesktop(true)
    await mount(() =>
      h(
        ResponsiveAppShell,
        { sidebarWidth: 'lg' },
        {
          default: () => [
            h(ResponsiveAppShell.Sidebar, null, { default: nav }),
            h(ResponsiveAppShell.Content, null, { default: () => 'Page body' }),
          ],
        },
      ),
    )
    expect(body().getByRole('complementary').style.width).toBe('256px')
  })

  it('accepts an exact pixel sidebarWidth', async () => {
    setDesktop(true)
    await mount(() =>
      h(
        ResponsiveAppShell,
        { sidebarWidth: 300 },
        {
          default: () => [
            h(ResponsiveAppShell.Sidebar, null, { default: nav }),
            h(ResponsiveAppShell.Content, null, { default: () => 'Page body' }),
          ],
        },
      ),
    )
    expect(body().getByRole('complementary').style.width).toBe('300px')
  })
})

describe('ResponsiveAppShell across the breakpoint', () => {
  it('swaps the shell wholesale when the viewport crosses 768px', async () => {
    await mount(shellTree)
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
    await mount(shellTree)
    trigger().click()
    await flush()
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
    expect(ResponsiveAppShell.TopBar).toBe(ResponsiveAppShellTopBar)
    expect(ResponsiveAppShell.Sidebar).toBe(ResponsiveAppShellSidebar)
    expect(ResponsiveAppShell.Drawer).toBe(ResponsiveAppShellDrawer)
    expect(ResponsiveAppShell.Content).toBe(ResponsiveAppShellContent)
  })

  it('throws a directive error when a sub-component renders outside the shell', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    /** Mounts a tree expected to fail; Vue rethrows the setup error from `mount`. */
    const mountFailing = (render: () => unknown): void => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      hosts.push(host)
      createApp({ render: () => render() }).mount(host)
    }
    try {
      expect(() => mountFailing(() => h(ResponsiveAppShellTopBar))).toThrow(
        /must be rendered inside <ResponsiveAppShell>/,
      )
      expect(() =>
        mountFailing(() => h(ResponsiveAppShellDrawer, null, { default: () => 'x' })),
      ).toThrow(/must be rendered inside <ResponsiveAppShell>/)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('hides the menu trigger when no Drawer is composed', async () => {
    await mount(() =>
      h(ResponsiveAppShell, null, {
        default: () => [
          h(ResponsiveAppShell.TopBar),
          h(ResponsiveAppShell.Sidebar, null, { default: nav }),
          h(ResponsiveAppShell.Content, null, { default: () => 'Page body' }),
        ],
      }),
    )
    expect(body().queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
  })
})

describe('useIsDesktop', () => {
  /** The rendered value of the composable, as a probe component paints it. */
  const desktopProbe = (): string | null | undefined =>
    document.querySelector('[data-mol-id="is-desktop"]')?.textContent

  /** Mounts a component that renders `useIsDesktop()`'s current value. */
  function mountProbe(): void {
    const Probe = defineComponent({
      name: 'IsDesktopProbe',
      setup() {
        const isDesktop = useIsDesktop()
        return () => h('span', { 'data-mol-id': 'is-desktop' }, String(isDesktop.value))
      },
    })
    mountSync(() => h(Probe))
  }

  it('reads matchMedia synchronously on first render and follows change events', async () => {
    setDesktop(true)
    mountProbe()
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
      mountProbe()
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
