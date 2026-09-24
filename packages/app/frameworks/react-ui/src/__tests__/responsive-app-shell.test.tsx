// @vitest-environment jsdom
/**
 * Render tests for the `ResponsiveAppShell` family: the mobile shell (top
 * bar + dialog drawer) and the desktop shell (sidebar) mount per the 768px
 * breakpoint, and the drawer implements the dialog a11y contract (focus
 * trap/restore, Escape, backdrop, scroll lock, route-change auto-close).
 *
 * @module
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns — tests advance it to
// simulate SPA navigation, then re-render.
const mockLocation = { pathname: '/dashboard', search: '', hash: '' }

// ---------------------------------------------------------------------------
// matchMedia mock. jsdom has no `window.matchMedia`; the shell reads it
// synchronously in its state initializer, so tests set `matches` BEFORE
// rendering. `setDesktop` + `fireViewportChange` simulate crossing 768px.
// ---------------------------------------------------------------------------
let matches = false
const changeListeners = new Set<(e: { matches: boolean }) => void>()

vi.mock('react-router', () => ({
  useLocation: () => ({ ...mockLocation }),
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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellSidebar,
  ResponsiveAppShellTopBar,
  useIsDesktop,
} = await import('../components/ResponsiveAppShell.js')

function setDesktop(next: boolean): void {
  matches = next
}

/** Fires the `change` listeners every mounted matchMedia subscription holds. */
function fireViewportChange(): void {
  act(() => {
    for (const listener of changeListeners) listener({ matches })
  })
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
  cleanup()
  mockLocation.pathname = '/dashboard'
  mockLocation.search = ''
  mockLocation.hash = ''
})

const nav = (
  <>
    <a href="/dashboard">Dashboard</a>
    <a href="/projects">Projects</a>
    <a href="/reports">Reports</a>
  </>
)

function Shell({ mobileOnlyTopBar = false }: { mobileOnlyTopBar?: boolean }): ReactElement {
  return (
    <ResponsiveAppShell>
      <ResponsiveAppShell.TopBar brand={<span>Timetrack</span>} mobileOnly={mobileOnlyTopBar} />
      <ResponsiveAppShell.Sidebar>{nav}</ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer>{nav}</ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <p>Page body</p>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

const trigger = (): HTMLElement => screen.getByRole('button', { name: 'Open navigation menu' })

describe('ResponsiveAppShell on mobile (<768px)', () => {
  it('renders top bar + content, with the sidebar unmounted and the drawer closed by default', () => {
    render(<Shell />)
    expect(screen.getByRole('banner')).toBeDefined()
    expect(screen.getByRole('main')).toBeDefined()
    expect(screen.getByText('Page body')).toBeDefined()
    // Desktop chrome must not exist — not even CSS-hidden.
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    // The trigger is present, wired to the (absent) panel, and reports closed.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    // React 19 useId format — the exact value is asserted against the panel
    // id once the drawer is open (the test below).
    expect(trigger().getAttribute('aria-controls')).toBeTruthy()
  })

  it('the trigger opens the drawer dialog, moves focus into it, and reports expanded', () => {
    render(<Shell />)
    fireEvent.click(trigger())

    const dialog = screen.getByRole('dialog')
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
    expect(document.activeElement).toBe(
      document.querySelector('[data-mol-id="shell-drawer-close"]'),
    )
    expect(screen.getByRole('dialog').id).toBe(trigger().getAttribute('aria-controls'))
    // Body scroll locks while the drawer is open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Escape closes the drawer, unlocks scroll, and restores focus to the trigger', () => {
    render(<Shell />)
    // fireEvent.click does not move focus — a real user's pointer click does,
    // so focus the trigger first to make the restore assertion meaningful.
    trigger().focus()
    fireEvent.click(trigger())
    expect(screen.getByRole('dialog')).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger())
  })

  it('a backdrop click closes the drawer but a click inside the panel does not', () => {
    render(<Shell />)
    fireEvent.click(trigger())
    const dialog = screen.getByRole('dialog')

    // Click on a link inside the panel — the panel stops propagation.
    fireEvent.click(within(dialog).getByText('Dashboard'))
    expect(screen.getByRole('dialog')).toBeDefined()

    // Click on the fixed backdrop wrapper (the panel's parent).
    fireEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('the close button closes the drawer', () => {
    render(<Shell />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Tab wraps from the last link back to the first tab stop (focus trap)', () => {
    render(<Shell />)
    fireEvent.click(trigger())
    const dialog = screen.getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    links[links.length - 1]!.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(
      document.querySelector('[data-mol-id="shell-drawer-close"]'),
    )
  })

  it('Shift+Tab from the first tab stop wraps to the last link', () => {
    render(<Shell />)
    fireEvent.click(trigger())
    document.querySelector<HTMLElement>('[data-mol-id="shell-drawer-close"]')!.focus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    const dialog = screen.getByRole('dialog')
    const links = within(dialog).getAllByRole('link')
    expect(document.activeElement).toBe(links[links.length - 1])
  })

  it('closes on SPA navigation so it never covers the next page', () => {
    const { rerender } = render(<Shell />)
    fireEvent.click(trigger())
    expect(screen.getByRole('dialog')).toBeDefined()

    mockLocation.pathname = '/projects'
    rerender(<Shell />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('carries the fleet data-mol-id defaults for locators', () => {
    render(<Shell />)
    expect(document.querySelector('[data-mol-id="shell-root"]')).toBeDefined()
    expect(document.querySelector('[data-mol-id="shell-topbar"]')).toBeDefined()
    expect(trigger().getAttribute('data-mol-id')).toBe('shell-drawer-open')
    expect(document.querySelector('[data-mol-id="shell-content"]')).toBeDefined()
  })
})

describe('ResponsiveAppShell on desktop (>=768px)', () => {
  it('renders the sidebar nav landmarks + content, with no trigger and no drawer', () => {
    setDesktop(true)
    render(<Shell />)

    const aside = screen.getByRole('complementary')
    expect(aside.getAttribute('data-mol-id')).toBe('shell-sidebar')
    expect(within(aside).getByRole('navigation').getAttribute('aria-label')).toBe(
      'Primary navigation',
    )
    expect(within(aside).getByRole('link', { name: 'Reports' })).toBeDefined()
    expect(screen.getByRole('main')).toBeDefined()

    // Mobile chrome must not exist — the drawer is inert on desktop.
    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not render the top bar when mobileOnly is set', () => {
    setDesktop(true)
    render(<Shell mobileOnlyTopBar />)
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('still renders the top bar on mobile when mobileOnly is set', () => {
    render(<Shell mobileOnlyTopBar />)
    expect(screen.getByRole('banner')).toBeDefined()
  })

  it('applies the sidebarWidth preset to the sidebar geometry', () => {
    setDesktop(true)
    render(
      <ResponsiveAppShell sidebarWidth="lg">
        <ResponsiveAppShell.Sidebar>{nav}</ResponsiveAppShell.Sidebar>
        <ResponsiveAppShell.Content>Page body</ResponsiveAppShell.Content>
      </ResponsiveAppShell>,
    )
    expect(screen.getByRole('complementary').style.width).toBe('256px')
  })

  it('accepts an exact pixel sidebarWidth', () => {
    setDesktop(true)
    render(
      <ResponsiveAppShell sidebarWidth={300}>
        <ResponsiveAppShell.Sidebar>{nav}</ResponsiveAppShell.Sidebar>
        <ResponsiveAppShell.Content>Page body</ResponsiveAppShell.Content>
      </ResponsiveAppShell>,
    )
    expect(screen.getByRole('complementary').style.width).toBe('300px')
  })
})

describe('ResponsiveAppShell across the breakpoint', () => {
  it('swaps the shell wholesale when the viewport crosses 768px', () => {
    render(<Shell />)
    expect(trigger()).toBeDefined()

    setDesktop(true)
    fireViewportChange()

    expect(screen.queryByRole('complementary')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(screen.queryByRole('banner')).not.toBeNull()

    setDesktop(false)
    fireViewportChange()

    expect(screen.queryByRole('complementary')).toBeNull()
    expect(trigger()).toBeDefined()
  })

  it('an open drawer closes on desktop-crossing resize and does not resurface back on mobile', () => {
    render(<Shell />)
    fireEvent.click(trigger())
    expect(screen.getByRole('dialog')).toBeDefined()

    setDesktop(true)
    fireViewportChange()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')

    setDesktop(false)
    fireViewportChange()
    // The logical open state was dropped at the crossing — no surprise drawer.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()
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
    try {
      expect(() => render(<ResponsiveAppShellTopBar />)).toThrow(
        /must be rendered inside <ResponsiveAppShell>/,
      )
      expect(() => render(<ResponsiveAppShellDrawer>x</ResponsiveAppShellDrawer>)).toThrow(
        /must be rendered inside <ResponsiveAppShell>/,
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('hides the menu trigger when no Drawer is composed', () => {
    render(
      <ResponsiveAppShell>
        <ResponsiveAppShell.TopBar />
        <ResponsiveAppShell.Sidebar>{nav}</ResponsiveAppShell.Sidebar>
        <ResponsiveAppShell.Content>Page body</ResponsiveAppShell.Content>
      </ResponsiveAppShell>,
    )
    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
  })
})

describe('useIsDesktop', () => {
  it('reads matchMedia synchronously on first render and follows change events', async () => {
    const { renderHook } = await import('@testing-library/react')
    setDesktop(true)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)

    setDesktop(false)
    fireViewportChange()
    expect(result.current).toBe(false)
  })

  it('returns false (mobile shell) in non-browser environments', async () => {
    const { renderHook } = await import('@testing-library/react')
    const original = window.matchMedia
    // @ts-expect-error — simulating an SSR-like global without matchMedia.
    delete window.matchMedia
    try {
      const { result } = renderHook(() => useIsDesktop())
      expect(result.current).toBe(false)
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: original,
      })
    }
  })
})
